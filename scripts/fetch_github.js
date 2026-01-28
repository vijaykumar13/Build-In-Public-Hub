const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../web/.env.local') });
const { Octokit } = require("octokit");
const { createClient } = require('@supabase/supabase-js');

// Config
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GITHUB_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Environment Variables.");
    if (process.argv.includes('--dry-run')) {
        console.log("Running in DRY RUN mode");
    }
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });
const supabase = createClient(SUPABASE_URL || 'https://mock.supabase.co', SUPABASE_KEY || 'mock');

const DEVELOPERS_TO_TRACK = [
    // Build in Public Heroes
    'levelsio', 'marclou', 'dannypostma', 'yongfook', 'pbteja1998',
    'tibomaker', 'arvidkahl', 'alexwestco', 'alexanderisora',
    // Vercel / Next.js / React Ecosystem
    'shadcn', 'leerob', 'nutlope', 'antfu', 'yyx990803', 'gaearon', 'sindresorhus', 'timneutkens', 'delbaoliveira',
    // Open Source Titans
    'torvalds', 'tj', 'addyosmani', 'paulirish', 'mojombo', 'defunkt', 'mbostock',
    'taylorotwell', 'dhh', 'karpathy', 'mdo', 'fat', 'rauchg',
    // More Indie Hackers / Makers
    'kitze', 'posva', 'developit', 'Rich-Harris', 'mrdoob', 'feross', 'btholt', 'kentcdodds'
];

async function main() {
    console.log(`🚀 Starting Ingestion Cycle for ${DEVELOPERS_TO_TRACK.length} developers...`);

    for (const dev of DEVELOPERS_TO_TRACK) {
        // Slow down slightly to be nice to the API
        await new Promise(r => setTimeout(r, 500));
        const stats = await fetchGitHubData(dev);
        await updateDatabase(stats);
    }

    console.log("\n✅ Ingestion Complete.");
}

async function fetchGitHubData(username) {
    console.log(`\n🔍 Fetching data for: ${username}`);

    // MOCK MODE CHECK
    if (GITHUB_TOKEN === 'mock-github-token') {
        console.log("   ⚠️  Using MOCK MODE (No API calls)");
        await new Promise(r => setTimeout(r, 100));
        return {
            username: username,
            full_name: `${username} (Mock)`,
            avatar_url: `https://github.com/${username}.png`,
            bio: "Mock Bio",
            location: "Internet",
            twitter_username: username,
            website_url: `https://github.com/${username}`,
            github_commits: Math.floor(Math.random() * 500),
            github_stars: Math.floor(Math.random() * 100),
            followers: Math.floor(Math.random() * 1000)
        };
    }

    try {
        const { data: user } = await octokit.rest.users.getByUsername({ username });
        const { data: events } = await octokit.rest.activity.listPublicEventsForUser({
            username,
            per_page: 100
        });

        const pushEvents = events.filter(e => e.type === 'PushEvent');
        const commitCount = pushEvents.reduce((acc, e) => acc + e.payload.size, 0);

        console.log(`   ✅ User found: ${user.name || username}`);

        return {
            username: user.login,
            full_name: user.name,
            avatar_url: user.avatar_url,
            bio: user.bio,
            location: user.location,
            twitter_username: user.twitter_username,
            website_url: user.blog,
            github_commits: commitCount,
            github_stars: 0,
            followers: user.followers
        };

    } catch (error) {
        console.error(`   ❌ Error fetching ${username}:`, error.message);
        return null;
    }
}

async function updateDatabase(stats) {
    if (!stats) return;

    if (SUPABASE_KEY === 'mock-service-role-key') {
        console.log(`   💾 [MOCK] Database updated for ${stats.username}`);
        return;
    }

    const { data: developer, error: devError } = await supabase
        .from('developers')
        .upsert({
            username: stats.username,
            full_name: stats.full_name,
            avatar_url: stats.avatar_url,
            bio: stats.bio,
            location: stats.location,
            twitter_username: stats.twitter_username,
            website_url: stats.website_url,
            total_score: (stats.github_commits * 0.5) + (stats.followers * 0.001), // Basic score calc
            updated_at: new Date()
        }, { onConflict: 'username' })
        .select()
        .single();

    if (devError) {
        console.error('   ❌ DB Upsert Error:', devError.message);
        return;
    }

    const { error: histError } = await supabase
        .from('stats_history')
        .insert({
            developer_id: developer.id,
            github_commits_last_30_days: stats.github_commits,
            twitter_followers: stats.followers
        });

    if (histError) {
        console.error('   ❌ DB History Error:', histError.message);
    } else {
        console.log(`   💾 Database updated for ${stats.username}`);
    }
}

// Export for use in scheduler
module.exports = { main, fetchGitHubData, updateDatabase, DEVELOPERS_TO_TRACK };

// Run directly if this file is executed
if (require.main === module) {
    main();
}

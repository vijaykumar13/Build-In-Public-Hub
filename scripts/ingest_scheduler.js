/**
 * Ingest Scheduler
 *
 * This script handles scheduled data fetching from:
 * - GitHub API (implemented)
 * - X (Twitter) API (TODO)
 * - Product Hunt API (TODO)
 *
 * Schedule: Every 6 hours by default (cron: 0 *\/6 * * *)
 *
 * Usage:
 *   node scripts/ingest_scheduler.js          # Start scheduler daemon
 *   node scripts/ingest_scheduler.js --now    # Run once immediately
 *   node scripts/ingest_scheduler.js --test   # Test mode (dry run)
 */

const cron = require('node-cron');
const { main: fetchGitHub } = require('./fetch_github');
const { main: fetchTwitter } = require('./fetch_twitter');

// Configuration
const CRON_SCHEDULE = process.env.INGEST_SCHEDULE || '0 */6 * * *'; // Every 6 hours
const TIMEZONE = process.env.INGEST_TIMEZONE || 'America/New_York';

// Logging helper
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const prefix = {
        'INFO': '\u2139\uFE0F ',
        'SUCCESS': '\u2705',
        'ERROR': '\u274C',
        'START': '\uD83D\uDE80',
        'SCHEDULE': '\u23F0'
    }[level] || '';
    console.log(`[${timestamp}] ${prefix} ${message}`);
}

// Main ingestion function
async function runIngestion() {
    log('Starting scheduled data ingestion...', 'START');
    const startTime = Date.now();

    try {
        // GitHub ingestion
        log('Running GitHub data fetch...', 'INFO');
        await fetchGitHub();
        log('GitHub data fetch complete', 'SUCCESS');

        // Twitter/X ingestion
        log('Running Twitter data fetch...', 'INFO');
        await fetchTwitter();
        log('Twitter data fetch complete', 'SUCCESS');

        // TODO: Product Hunt ingestion
        // log('Running Product Hunt data fetch...', 'INFO');
        // await fetchProductHunt();
        // log('Product Hunt data fetch complete', 'SUCCESS');

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        log(`Ingestion cycle complete in ${duration}s`, 'SUCCESS');

    } catch (error) {
        log(`Ingestion failed: ${error.message}`, 'ERROR');
        console.error(error);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const runNow = args.includes('--now');
const testMode = args.includes('--test');

if (testMode) {
    log('Test mode enabled - no actual API calls will be made', 'INFO');
    process.env.GITHUB_TOKEN = 'mock-github-token';
    process.env.TWITTER_BEARER_TOKEN = 'mock-twitter-token';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
}

if (runNow) {
    // Run once immediately and exit
    log('Running one-time ingestion...', 'INFO');
    runIngestion().then(() => {
        log('One-time ingestion finished', 'SUCCESS');
        process.exit(0);
    }).catch((error) => {
        log(`One-time ingestion failed: ${error.message}`, 'ERROR');
        process.exit(1);
    });
} else {
    // Start the scheduler daemon
    log('Starting Data Ingestion Scheduler...', 'START');
    log(`Schedule: ${CRON_SCHEDULE} (${TIMEZONE})`, 'SCHEDULE');

    // Validate cron expression
    if (!cron.validate(CRON_SCHEDULE)) {
        log(`Invalid cron expression: ${CRON_SCHEDULE}`, 'ERROR');
        process.exit(1);
    }

    // Schedule the job
    const job = cron.schedule(CRON_SCHEDULE, () => {
        runIngestion();
    }, {
        scheduled: true,
        timezone: TIMEZONE
    });

    log('Scheduler is running. Press Ctrl+C to stop.', 'INFO');
    log('Next run will be at the scheduled time.', 'SCHEDULE');

    // Run immediately on startup (optional - remove if not desired)
    if (args.includes('--run-on-start')) {
        log('Running initial ingestion on startup...', 'INFO');
        runIngestion();
    }

    // Graceful shutdown
    process.on('SIGINT', () => {
        log('Shutting down scheduler...', 'INFO');
        job.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        log('Received SIGTERM, shutting down...', 'INFO');
        job.stop();
        process.exit(0);
    });
}

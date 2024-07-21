let config = {}
// exp id:
config.experimentId = process.env['EXPERIMENT_ID'];

// openai
config.apiKey = process.env['OPENAI_API_KEY'];
config.apiTokenLimit = parseInt(process.env["OPENAI_TOKEN_LIMIT"] || "200");

// postgres
config.connectionString = process.env['DATABASE_URL'];
config.resultsTable = process.env['RESULTS_PGTABLE'] || "human_ai_interactions_lab_results";
config.codesTable = process.env['CODES_PGTABLE'] || "human_ai_interactions_lab_codes";


// save results
config.resultsFile = process.env['RESULTS_FILE'];
config.resultsRedirectUrl = process.env['REDIRECT_URL'];
config.encodeBase64 = process.env['BASE64_ENCODE'] && parseInt(process.env['BASE64_ENCODE']) != 0;

// secret code ... temporary
config.reusableCode = process.env['REUSABLE_CODE'];
module.exports = config;
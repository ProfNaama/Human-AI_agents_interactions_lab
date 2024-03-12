const express = require('express');
const bodyParser = require('body-parser');
const OpenAIApi = require("openai");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const app = express();
const helpers = require("./helpers.js");

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }))
app.set('view engine', 'pug');


// Initialization
app.use(cookieParser());
app.use(session({
    secret: "SSsseess",
    saveUninitialized: true,
    resave: true
}));

const tokenLimit = process.env.OPENAI_TOKEN_LIMIT || 20; 
const welcomeConsentMessage = "Welcome to the chat bot experiment. In this experiment, you are expected to solve a puzzle. "
    + "The puzzle is decided by a chatbot. "
    + "You will be interacting with the chatbot in order to solve the challange. "
    + "You shoudl interact with the chatbot until you will solve. "
    + "You can request help, request hints, work together etc. "
    + "In clicking the button below you agree to take part in the experiment along with the privacy policy. "
    + "Please click the button below to continue.";

const maxUID = 100000;

const openai = new OpenAIApi({
    apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});

// This middleware will be executed for every request to the app, making sure the session is initialized with uid, treatment group id, etc.
app.use(async (req, res, next) => {
    if (req.session.uid) {
        next();
        return;
    }

    let uid = helpers.getRandomInt(0, maxUID);
    if ("uid" in req.query) {
        uid = parseInt(req.query["uid"]);
    }

    req.session.uid = uid;
    req.session.treatmentGroupId = helpers.getTreatmentGroupId(uid);
    req.session.initialTask = ""
    req.session.systemRoleHiddenContent = "";
    req.session.conversationContext = [];
    req.session.userConfigFilter = {};
    req.session.save();
    console.log("new session. uid: " + req.session.uid + ", treatment group: " + req.session.treatmentGroupId);
    res.render('./welcome_consent', { 
        "title":"ChatLab",  
        "header_message":welcomeConsentMessage,  
        "body_message": welcomeConsentMessage,
    });

});

function renderUserConfigPage(req, res, userConfigProperties, userPropertiesCount) {
    let userMessage = "Please select your preference regarding the following property.";
    if (userPropertiesCount > 1) {
        userMessage = "For each of the following properties, please select your preferences.";
    }
    if (Object.keys(req.session.userConfigFilter).length == 0) {
        // this is the expected case, when the csv is set to let the user choose the properties.
        res.render('./user_config', { 
            "title":"ChatLab",  
            "header_message":"This is an experiment in which you should configure the chat bot",  
            "body_message": userMessage,
            userConfig: userConfigProperties
        });
    } else {
        // should not happen.
        // if we reached here, this means the user was required to choose a property, but the user config is not complete (i.e. some properties were not decided).
        console.log("Properties are not filtered correctly!. uid: " + req.session.uid + ", treatment group: " + req.session.treatmentGroupId + ", user config filter is set to : " + JSON.stringify(userConfigProperties));
        res.render('./error', {
            "title":"ChatLab",  
            "header_message":"Error",  
            "body_message": "Properties are not filtered correctly! Please contact the experimenter."
        });
    }
}

app.get('/', async (req, res) => {
    const filteredRecords = helpers.getSelectedRecords(req);
    let recordsByProperty = helpers.groupRecordsByProperty(filteredRecords);
    let userConfigProperties = helpers.filterUserConfigProperties(recordsByProperty);
    const userPropertiesCount = Object.keys(userConfigProperties).length;

    if (userPropertiesCount > 0) {
        // according to the csv, the user has some properties to decide on.
        // we redirect the user to the user_config page, where the user can configure the properties.
        // after the user config is set, the user is redirected back to this route again.
        renderUserConfigPage(req, res, userConfigProperties, userPropertiesCount);
        return;
    }

    // At this point, the hidden prompts are ready (either the user did not need to choose or the user has already configured the properties).
    // Save the hidden prompts to the session and redirect to the chat page, where the main interaction happens.
    helpers.setSelectedHiddenPromptToSession(req);
    helpers.logHiddenPrompts(req);
    res.sendFile(__dirname + '/chat.html');
});

app.post('/user_config', async (req, res) => {
    // the user config is saved in the session, we redirect to the root route again, this time the config is already set.
    req.session.userConfigFilter = req.body;
    req.session.save();
    res.redirect('/');
});

// the main chat route.
// each part of the conversation is stored in the session
// the conversation context is sent to the openai chat api
// response is sent back to the client
app.post('/chat-api', async (req, res) => {
    const message = req.body.message;
    req.session.conversationContext.push({ role: 'user', content: message });
    const messageWithContext = helpers.createFullConversationPrompt(req);
    try {
        const chatCompletion = await openai.chat.completions.create({
            messages: messageWithContext,
            model: 'gpt-3.5-turbo',
            //model: "gpt-3.5-turbo-0125",
            //model: "gpt-4",
            max_tokens: tokenLimit,
            temperature: 0.7
        });
        const apiReply = chatCompletion.choices[0].message.content;
        req.session.conversationContext.push({ role: 'assistant', content: apiReply });
        req.session.save();
        res.send(apiReply);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error processing request' });
    }
});

// backdoor hacks for developing stages
app.post('/chat-api-manipulation', async (req, res) => {
    const message = req.body.manipulation;
    
    if (message.length > 0) {
        req.session.systemRoleHiddenContent = message;
        req.session.save();
    }
    else {
        helpers.setSelectedHiddenPromptToSession(req)
    }
    helpers.logHiddenPrompts(req);
    res.send({"manipulation": req.session.systemRoleHiddenContent}); 
});

// backdoor hacks for developing stages
app.post('/chat-api-manipulation-task', async (req, res) => {
    const task = req.body.task;
    
    req.session.initialTask = task;
    req.session.save();
    helpers.logHiddenPrompts(req);
    res.send({"task": task}); 
});

// backdoor hacks for developing stages
app.get('/chat-api-reset', async (req, res) => {
    req.session.conversationContext = [];
    req.session.save();
    helpers.logHiddenPrompts(req);

    res.send("Chat context reset");
});

const port = process.env.PORT || 3030;
app.listen(port, () => console.log(`Server running on port ${port}`));


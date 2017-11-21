/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var githubClient = require('./github-client.js');


// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    stateEndpoint: process.env.BotStateEndpoint,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector, function (session) {
    (session)=>{
        session.endConversation("Hi I am github search Bot")
      }
});

const recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
recognizer.onEnabled((context,callback) =>{
    if(context.dialogStack().length >0){
        callback(null,false);
    }
    else{
        callback(null,true);
    }
})
   bot.recognizer(recognizer);
   const recognizer = new builder.LuisRecognizer("https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/f558369b-5426-4cfc-8c2b-e33e7cbbf458?subscription-key=2aa445960fb24d0095d2f7bd4d47c6eb&verbose=true&timezoneOffset=0&q=");
   recognizer.onEnabled((context,callback) =>{
       if(context.dialogStack().length >0){
           callback(null,false);
       }
       else{
           callback(null,true);
       }
   })
      bot.recognizer(recognizer);
  
  
  bot.dialog('search', [
      (session,args,next) => {
          const query = builder.EntityRecognizer.findEntity(args.intent.entity,'query');
          if(!query){
              builder.Prompts.text(session, 'Who are you looking for?');
             
          }
          else{
              
              next({response:query.entity});
              };
          },
          (session,results,next) => {
              var query = results.response;
              if(!query){
                  session.endDialog("Request Cancelled")
              }
              else{
                  githubClient.executeSearch(query, (profiles)=>{
                      var totalCount = profiles.total_count;
                      if(totalCount ==0){
                          session.endDialog("sorry No results found")
                      }
                      else if(totalCount > 10){
                          session.endDialog("too many results, please refine your search")
                      }
                      else{
                          session.dialogData.property = null;
                          var usernames = profiles.items.map((item)=>{return item.login});
                          builder.Prompts.choice(
                              session,'Please choose a user',
                              usernames,
                              {listStyle:builder.ListStyle.button}
                          );
                      }
  
                      });
                  }
          
      
              },
              (session,results,next)=> {
                  session.sendTyping();
                  var username = results.response.entity;
                  githubClient.loadProfile(username, function (profile) {
                      var card = new builder.ThumbnailCard(session);
          
                      card.title(profile.login);
                      card.images([builder.CardImage.create(session, profile.avatar_url)]);
                      if (profile.name) card.subtitle(profile.name);
          
                      var text = '';
                      if (profile.company) text += profile.company + ' \n';
                      if (profile.email) text += profile.email + ' \n';
                      if (profile.bio) text += profile.bio;
                      card.text(text);
          
                      card.tap(new builder.CardAction.openUrl(session, profile.html_url));
                      
                      var message = new builder.Message(session).attachments([card]);
                      session.send(message);
                  });
              }
          
  
      
  ]).triggerAction({
      matches:'SearchProg'
  })

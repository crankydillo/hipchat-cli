var fs = require('fs')
    _ = require('underscore'),
    moment = require('moment'),
    http = require('http'),
    testRoom = 'test',
    pathe = require('path-extra');

fs.readFile(pathe.homedir() + '/.hc-cli', function (err, data) {
  if (err) throw err;
  var cfg = JSON.parse(data);
  runCli(cfg.authToken);
});

function runCli(authToken) {
  var Hipchatter = require('hipchatter'),
      blessed = require('blessed'),
      hipchatter = new Hipchatter(authToken),
      screen = blessed.screen();

  screen.title = 'hc-cli';

  // Create a box perfectly centered horizontally and vertically.
  var chatMsgBox = blessed.box({
    parent: screen,
    width: '100%',
    height: screen.height - 1,
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    mouse: true,
    style: {
      fg: 'white',
      bg: 'black',
      scrollbar: {
        bg: 'blue'
      },
      border: {
        fg: '#f0f0f0'
      }
    }
  });

  var form = blessed.form({
    parent: screen,
    bottom: 0,
    height: 1 
  });

  var textbox = blessed.textbox({
    parent: form,
    height: '100%',
    mouse: true,
    inputOnFocus: true,
    value: '> '
  });

  function appendChat(author, date, msg) {
    append(chatMsgBox, 
           '[' + moment(date).format('HH:mm:ss') + '] ' +
           '{blue-fg}<{/blue-fg}' + author + '{blue-fg}>{/blue-fg} ' + 
             msg);

  }

  textbox.on('submit', function(data) {
    var msg = data.slice(2);
    appendChat(moment(), 'Name', msg);
    sendChat(msg);
    textbox.clearValue();
    textbox.setValue('> ');
    screen.render();
    textbox.focus();
  });

  function append(b, newData) {
    b.insertBottom(newData);
    b.scroll(100);
    screen.render();
  }

  screen.on('resize', function(data) {
    screen.render();
  });

  server = http.createServer(function (req, res) {
    var body = '';
    req.on('data', function (data) {
      body += data;
    });
    req.on('end', function () {
      appendChat('name', moment(), body);
    });
    res.end();
  }).listen(8070);

  // Quit on Escape, q, or Control-C.
  screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    server.close();
    return process.exit(0);
  });

  // Focus our element.
  textbox.focus();

  /*
  hipchatter.rooms(function(err, rooms){
    if (!err) {
      _.each(rooms, function(room) {
        append(chatMsgBox, room.name);
      });
    } else {
      // TODO
    }
  });

  hipchatter.create_webhook(
    testRoom, 
    {
      url: '',
      event: 'room_message'
    }, function(err, webhook) {
      if (!err) {
        console.log('Successfully created webhook id:'+webhook.id+'.');
        console.log(webhook);
      } else {
        console.log(err);
      }
    }
  );
 */
  hipchatter.history(testRoom, function(err, history){
    if (!err) {
      _.each(history.items, function(msg) {
        appendChat(msg.from.name, msg.date, msg.message);
      });
    } else {
      // todo
    }
  });

 function sendChat(msg) {
   hipchatter.notify(
     testRoom, 
     {
       message: msg,
       color: 'gray',
       message_format: 'text',
       token: 'fill-in'
     }, function(err){
       if (!err == null) {
         console.log('Successfully notified the room.');
       }
     }
   );
 }

  screen.key(['C-r'], function(ch, key) {
    append(chatMsgBox, 'C-r pressed!');
    screen.render();
    textbox.focus();
  });

  // Render the screen.
  screen.render();
}


var fs = require('fs'),
    _ = require('underscore'),
    moment = require('moment'),
    http = require('http'),
    pathe = require('path-extra');

process.title = 'hc-cli';

fs.readFile(pathe.homedir() + '/.hc-cli', function (err, data) {
  if (err) throw err;
  var cfg = JSON.parse(data);
  runCli(cfg.nick, cfg.jid, cfg.pwd, cfg.rooms);
});

function runCli(nick, jid, pwd, rooms) {
  var hc = require('./hipchat.js'),
      blessed = require('blessed'),
      screen = blessed.screen(),
      storedTitle, onlineFn;

  var roomNames = _.map(_.keys(rooms), function(n) { 
    return { 
      name: n,
      selected: false
    }; 
  });
  roomNames[0].selected = true;

  var roomFn = function(selectNum) {
    _.each(roomNames, function(r, idx) {
      if (selectNum === idx) {
        r.selected = true;
      } else {
        r.selected = false;
      }
    });
  };

  var roomsRender = function() {
    var names = _.map(roomNames, function(r) {
        if (r.selected) {
          return '{blue-fg}' + r.name + '{/blue-fg}';
        }
        return r.name;
      });
    return names.join(' | ');
  };

  var roomBox = blessed.box( {
    parent: screen,
    top: 0,
    width: '100%',
    height: 1,
    mouse: true,
    align: 'right',
    content: roomsRender(),
    tags: true,
    style: {
      fg: 'white'
    }
  });

  var line = blessed.line({
    parent: screen,
    top: 1,
    orientation: 'horizontal',
    width: '100%'
  });

  var chatMsgBox = blessed.box({
    parent: screen,
    width: '100%',
    top: 2,
    height: screen.height - 3,
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    mouse: true,
    keys: true,
    vi: true,
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

  onlineFn = function(client) {

    client.onMessage(function(msg, author) {
      appendChat(msg, author);
    });

    client.onError(function(err) {
      appendChat('error: ' + err);
    });

    _.each(_.values(rooms), function(r) { client.join(r) });

    textbox.on('submit', function(data) {
      var msg = data.slice(2);
      client.sendGroupChat(roomJid, msg);
      textbox.clearValue();
      textbox.setValue('> ');
      screen.render();
      textbox.focus();
    });

    // TODO feels bad putting this in 2 different places...
    // Quit on Escape, q, or Control-C.
    screen.key(['escape', 'q', 'C-c'], function(ch, key) {
      client.disconnect();
      return process.exit(0);
    });
  };

  hc.connect(jid, pwd, nick, onlineFn);

  function appendChat(msg, author, date) {
    author = author || 'Author';
    date = date || moment();

    append(chatMsgBox, 
           '[' + moment(date).format('HH:mm:ss') + '] ' +
             '{blue-fg}<{/blue-fg}' + author + '{blue-fg}>{/blue-fg} ' + 
             msg);
  }

  function append(b, newData) {
    b.insertBottom(newData);
    b.scroll(100);
    screen.render();
  }

  screen.on('resize', function(data) {
    screen.render();
  });

  textbox.key('escape', function(ch, key) {
    chatMsgBox.focus();
  });

  // Quit on Escape, q, or Control-C.
  screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
  });

  // Focus our element.
  textbox.focus();

  screen.key(['C-r'], function(ch, key) {
    append(chatMsgBox, 'C-r pressed!');
    screen.render();
    textbox.focus();
  });

  screen.key(['tab'], function(ch, key) {
    var currRoomIdx = _.findIndex(roomNames, function(r) {
      return r.selected;
    });
    var nextRoomIdx = 0;
    if (currRoomIdx < roomNames.length - 1 && currRoomIdx >= 0) {
      nextRoomIdx = currRoomIdx + 1;
    }
    roomFn(nextRoomIdx);
    roomBox.content = roomsRender();
    screen.render();
  });

  screen.key(['i'], function(ch, key) {
    textbox.focus();
  });

  // Render the screen.
  screen.render();
}

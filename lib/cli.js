var fs = require('fs'),
    _ = require('underscore'),
    moment = require('moment'),
    http = require('http'),
    pathe = require('path-extra'),
    winston = require('winston');

var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ 
        level: 'debug',
        //handleExceptions: true,
        json: false,
        filename: 'hc.log' 
      })
    ],
    exitOnError: false
});

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

  var chatBoxes = function() {
    var arr = _.map(rooms, function(room, roomName) {
      return mkChatBox(roomName, room);
    });

    return _.object(_.pluck(arr, 'jid'), arr);
  }();

  var currentChatBox = function() {
    return _.find(chatBoxes, function(c) { return c.selected; });
  };

  var roomTabs = mkRoomTabs();

  // delimiter between tabs and chatbox
  var line = blessed.line({
    parent: screen,
    top: 1,
    orientation: 'horizontal',
    width: '100%'
  });

  var textbox = mkTextbox();
  textbox.key('escape', function(ch, key) {
    var chatBox = currentChatBox().chatBox;
    if (chatBox) {
      chatBox.focus();
    }
  });

  onlineFn = function(client) {

    client.onMessage(function(msg, author, roomJid, date) {
      var chatBox = chatBoxes[roomJid].chatBox;
      appendChat(chatBox, msg, author, date);
    });

    client.onError(function(err) {
      appendChat(currentChatBox().chatBox, 'error: ' + err);
    });

    _.each(_.values(rooms), function(r) { client.join(r.jid) });

    textbox.on('submit', function(data) {
      var msg = data.slice(2);
      client.sendGroupChat(currentChatBox().jid, msg);
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

  function appendChat(chatBox, msg, author, date) {
    author = author || 'Author';
    if (author.length > 12) {
      author = author.substr(0, 10) + '..';
    }
    date = date || moment();
    chatBox.insertBottom(
           '[' + moment(date).format('dd HH:mm') + '] ' +
             '{blue-fg}<{/blue-fg}' + author + '{blue-fg}>{/blue-fg} ' + 
             msg);
    chatBox.scroll(100);
    screen.render();
  }

  screen.on('resize', function(data) {
    screen.render();
  });

  screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
  });

  screen.key(['tab'], function(ch, key) {
    var chatBoxArr = _.values(chatBoxes);
    var currRoomIdx = _.findIndex(chatBoxArr, function(r) {
      return r.selected;
    });
    chatBoxArr[currRoomIdx].selected = false;
    chatBoxArr[currRoomIdx].chatBox.hide();

    var nextRoomIdx = 0;
    if (currRoomIdx < _.keys(rooms).length - 1 && currRoomIdx >= 0) {
      nextRoomIdx = currRoomIdx + 1;
    }

    chatBoxArr[nextRoomIdx].selected = true;
    chatBoxArr[nextRoomIdx].chatBox.focus();
    chatBoxArr[nextRoomIdx].chatBox.show();

    screen.render();
  });

  screen.key(['i'], function(ch, key) {
    textbox.focus();
  });

  textbox.focus();
  screen.render();

  function mkChatBox(roomName, room) {
    var chatBox = blessed.box({
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
        hidden: !room.selected,
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

    chatBox.on('prerender', function() {
      chatBox.height = screen.height - 3;
    });

    return {
      name: roomName,
      jid: room.jid,
      selected: room.selected,
      chatBox: chatBox
    };
  }

  function mkRoomTabs() {
    var tabs = blessed.box( {
      parent: screen,
      top: 0,
      width: '100%',
      height: 1,
      mouse: true,
      align: 'right',
      tags: true,
      style: {
        fg: 'white'
      }
    });

    tabs.on('prerender', function() {
      var names = _.map(chatBoxes, function(r) {
        if (r.selected) {
          return '{bold}' + r.name + '{/bold}';
        }
        return r.name;
      });

      tabs.setContent(names.join(' | '));
    });

    return tabs;
  }

  function mkTextbox() {
    var textbox,
        form = blessed.form({
          parent: screen,
          bottom: 0,
          height: 1 
        });

    return blessed.textbox({
      parent: form,
      height: '100%',
      mouse: true,
      inputOnFocus: true,
      value: '> '
    });

  }
}

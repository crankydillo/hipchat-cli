var blessed = require('blessed');

// Create a screen object.
var screen = blessed.screen();

screen.title = 'hc-cli';

// Create a box perfectly centered horizontally and vertically.
var box = blessed.box({
  width: '100%',
  height: '100%',
  tags: true,
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: '#f0f0f0'
    }
  }
});

var form = blessed.form({
  parent: box,
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

textbox.on('submit', function(data) {
  append(box, '{blue-fg}<{/blue-fg}Name{blue-fg}>{/blue-fg} ' + data.slice(2));
  textbox.clearValue();
  textbox.setValue('> ');
  screen.render();
  textbox.focus();
});

function append(b, newData) {
  var content = b.getContent();
  b.setContent(content + '\n' + newData);
}

screen.on('resize', function(data) {
  screen.render();
});

screen.append(box);

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

// Focus our element.
textbox.focus();

// Render the screen.
screen.render();

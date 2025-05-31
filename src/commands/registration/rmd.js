import dele from './dele.js';

export default {
  directive: ['RMD', 'XRMD'],
  handler: function (args) {
    return dele.handler.call(this, args);
  },
  syntax: '{{cmd}} <path>',
  description: 'Remove a directory'
};

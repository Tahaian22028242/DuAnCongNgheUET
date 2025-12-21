module.exports = {
  // ...các cấu hình khác...
  resolve: {
    extensions: ['.js', '.jsx'],
    alias: {
      'date-fns': path.resolve(__dirname, 'node_modules/date-fns'),
    },
  },
};
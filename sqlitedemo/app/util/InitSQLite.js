Ext.define('SqliteDemo.util.InitSQLite', {
  singleton : true,

  requires: [
    'Sqlite.Connection',
    'Sqlite.data.proxy.SqliteStorage',
    'Ext.data.reader.Array'
  ],
  
  initDb: function() {
    Ext.ns('DbConnection');
    
    Ext.DbConnection = Ext.create('Sqlite.Connection', {
      dbName: 'sqlitedemo',
      dbDescription: 'Used to demo Sencha Touch 2 sqlite proxy'
    });
  }
});

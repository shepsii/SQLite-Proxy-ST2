
//<debug>
Ext.Loader.setPath({
    'Ext': 'sdk/src',
    'SqliteDemo': 'app',
    'Sqlite': '../sqlite'
});
//</debug>

Ext.require('SqliteDemo.util.InitSQLite');

Ext.application({
    name: 'SqliteDemo',

    requires: [
        'Ext.MessageBox'
    ],

    views: ['Main'],
    
    controllers: ['Person'],

    icon: {
        57: 'resources/icons/Icon.png',
        72: 'resources/icons/Icon~ipad.png',
        114: 'resources/icons/Icon@2x.png',
        144: 'resources/icons/Icon~ipad@2x.png'
    },
    
    phoneStartupScreen: 'resources/loading/Homescreen.jpg',
    tabletStartupScreen: 'resources/loading/Homescreen~ipad.jpg',
    
    onReady: function() {
      SqliteDemo.util.InitSQLite.initDb();
    },
    
    launch: function() {
        // Destroy the #appLoadingIndicator element
        Ext.fly('appLoadingIndicator').destroy();

        // Initialize the main view
        Ext.Viewport.add(Ext.create('SqliteDemo.view.Main'));
    },

    onUpdated: function() {
        Ext.Msg.confirm(
            "Application Update",
            "This application has just successfully been updated to the latest version. Reload now?",
            function() {
                window.location.reload();
            }
        );
    }
});

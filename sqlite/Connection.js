// var a = {dbName : "test",dbVersion : "1.0",dbDescription: "testdb",dbSize : 65536};

Ext.define('Sqlite.Connection', {
	extend: 'Ext.util.Observable',
	/**
	 * @cfg {String} dbName
	 * Name of database
	 */
	dbName: undefined,

	/**
	 * @cfg {String} version
	 * database version. If different than current, use updatedb event to update database
	 */
	dbVersion: '1.19',

	/**
	 * @cfg {String} dbDescription
	 * Description of the database
	 */
	dbDescription: '',

	/**
	 * @cfg {String} dbSize
	 * Max storage size in bytes
	 */
	dbSize: 5 * 1024 * 1024,

	/**
	 * @cfg {String} dbConn
	 * database connection object
	 */
	dbConn: undefined,

	constructor: function (config) {
		config = config || {};

		Ext.apply(this, config);
		var me = this;

		me.callParent([this]);
		me.dbConn = openDatabase(me.dbName, me.dbVersion, me.dbDescription, me.dbSize);
		return me;
	}
});
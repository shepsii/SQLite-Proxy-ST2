/**
 * @author Simon Shepherd
 *
 * Based on proxy written by Thomas Alexander and released with his permission
 *
 * This sqlite proxy concentrates on mimicing behavior of localstorage while
 * finishing operations only when the sql transactions return and grouping
 * queries into transactions wherever possible
 */
Ext.define('Sqlite.data.proxy.SqliteStorage', {
	extend: 'Ext.data.proxy.Client',
	alias: 'proxy.sqlitestorage',

	config: {
		reader: null,
		writer: null,
		dbConfig: null
	},

	constructor: function (config) {
		this.callParent([config]);

		this.setReader(this.reader);
		var me = this;
		me.setTable();
	},


	/* INTERFACE FUNCTIONS */

	//inherit docs
	create: function (operation, callback, scope) {
		var me = this;
		var records = operation.getRecords(),
				length = records.length, i,
				queries = [];

		onSuccess = function () {
			operation.setCompleted();
			operation.setSuccessful();
			if (typeof callback == 'function') {
				callback.call(scope, operation);
			}
		},
				onError = function (tx, err) {
					operation.setCompleted();
					operation.setException(err ? err : '');
					if (typeof callback == 'function') {
						callback.call(scope, operation);
					}
				};

		operation.setStarted();

		// add empty table? (look at full rewrite)
		if (Ext.isDefined(operation.config.fullRewrite) && operation.config.fullRewrite) {
			queries.push(function (tx) {
				tx.executeSql('DELETE FROM ' + me.getDbConfig().tablename, []);
			});
		}

		// add in each insert
		for (i = 0; i < length; i++) {
			queries.push(this.getInsertRecordFunc(records[i], me.getDbConfig().tablename));
		}

		// do transaction
		me.transactionDB(me.getDb(), queries, onSuccess, onError);

	},

	//inherit docs
	update: function (operation, callback, scope) {
		var me = this;
		var records = operation.getRecords(),
				length = records.length, i,
				queries = [];

		onSuccess = function () {
			operation.setCompleted();
			operation.setSuccessful();
			if (typeof callback == 'function') {
				callback.call(scope, operation);
			}
		},
				onError = function (tx, err) {
					operation.setCompleted();
					operation.setException(err ? err : '');
					if (typeof callback == 'function') {
						callback.call(scope, operation);
					}
				};

		operation.setStarted();

		// add in each insert
		for (i = 0; i < length; i++) {
			queries.push(this.getUpdateRecordFunc(records[i], me.getDbConfig().tablename));
		}

		// do transaction
		me.transactionDB(me.getDb(), queries, onSuccess, onError);

	},

	//inherit docs
	destroy: function (operation, callback, scope) {
		var me = this;
		var records = operation.getRecords(),
				length = records.length, i,
				queries = [];

		onSuccess = function () {
			operation.setCompleted();
			operation.setSuccessful();
			if (typeof callback == 'function') {
				callback.call(scope, operation);
			}
		},
				onError = function (tx, err) {
					operation.setCompleted();
					operation.setException(err ? err : '');
					if (typeof callback == 'function') {
						callback.call(scope, operation);
					}
				};

		operation.setStarted();

		for (i = 0; i < length; i++) {
			queries.push(this.getDeleteRecordFunc(records[i], me.getDbConfig().tablename));
		}

		// do transaction
		me.transactionDB(me.getDb(), queries, onSuccess, onError);
	},

	truncate: function (tablename) {
		var me = this;
		var sql = 'DELETE FROM ' + me.getDbConfig().tablename;
		me.transactionDB(me.getDb(), [function (tx) {
			tx.executeSql(sql, [], Ext.emptyFn, Ext.emptyFn);
		}], Ext.emptyFn, Ext.emptyFn);
		return true;
	},

	//inherit docs
	read: function (operation, callback, scope) {
		var me = this,
				limit = operation.getLimit(),
				start = operation.getStart(),
				grouper = operation.getGrouper(),
				sorters = operation.getSorters(),
				filters = operation.getFilters(),
				fieldTypes = {};

		grouper = this.applyGrouper(grouper);
		filters = this.applyFilters(filters);
		sorters = this.applySorters(sorters);

		// generate sql
		var sql = "SELECT _ROWID_,*\nFROM " + me.getDbConfig().tablename;
		if (filters != null) sql += me.whereClause(filters);
		if (grouper != null) sql += me.groupClause(grouper);
		if (sorters != null) sql += me.orderClause(sorters);
		if (limit != null && start != null) sql += me.limitClause(limit, start);
		var onSuccess, onError;

		onSuccess = function (tx, results) {
			me.applyDataToModel(tx, results, operation, callback, scope);
		};

		onError = function (tx, err) {
			me.throwDbError(tx, err);
		};

		me.transactionDB(me.getDb(), [function (tx) {
			tx.executeSql(sql, [], onSuccess, onError);
		}], Ext.emptyFn, Ext.emptyFn);
	},


	/* GENERAL DB FUNCTIONS */

	getDb: function () {
		return this.getDbConfig().dbConn.dbConn;
	},

	throwDbError: function (tx, err) {
		var me = this;
		console.log(this.type + "----" + err.message);
	},

	setTable: function () {
		var me = this,

				onError = function (tx, err) {
					me.throwDbError(tx, err);
				},

				createTable = function (tx) {
					tx.executeSql('CREATE TABLE IF NOT EXISTS ' +
							me.getDbConfig().tablename + '(' + me.constructFields() + ')', [],
							Ext.emptyFn, onError);

				},

				checkDataExists = function (tx) {

					tx.executeSql('SELECT * FROM ' + me.getDbConfig().tablename + ' LIMIT 1',
							[], function (tx, result) {

								if (result.rows.length == 0) {
									tx.executeSql('DROP TABLE IF EXISTS ' + me.getDbConfig().tablename, [],
											createTable, onError);
								} else {
									checkExistingSchema(tx, result.rows.item(0));
								}

							}, onError);

				},

				checkExistingSchema = function (tx, data) {

					// rows we have:
					var existingFieldNames = Ext.Object.getKeys(data),
							neededFieldObjs = me.getDbFields(),
							neededFieldNames = [];
					Ext.each(neededFieldObjs, function (field) {
						neededFieldNames.push(field.name);
					}, this);

					// fields that need adding
					Ext.each(Ext.Array.difference(neededFieldNames, existingFieldNames),
							function (addField) {
								var field = null;
								Ext.each(neededFieldObjs, function (fieldObj) {
									if (fieldObj.name == addField) {
										field = fieldObj;
										return false;
									}
								}, this);

								tx.executeSql('ALTER TABLE ' + me.getDbConfig().tablename +
										' ADD COLUMN ' + me.getFieldDefinition(field), [],
										function (tx) {

											if (Ext.isEmpty(field.field.getDefaultValue())) return;

											// update field to have default value
											tx.executeSql('UPDATE ' + me.getDbConfig().tablename +
													' SET ' + field.name + ' = ?', [ field.field.getDefaultValue() ],
													Ext.emptyFn, Ext.emptyFn);

										}, Ext.emptyFn);

							}, this);
				};

		me.transactionDB(me.getDb(), [function (tx) {
			tx.executeSql('SELECT sql FROM sqlite_master WHERE name=?',
					[ me.getDbConfig().tablename ],
					function (tx, result) {
						if (result.rows.length > 0) checkDataExists(tx);
						else createTable(tx);

					}, onError);

		}], Ext.emptyFn, Ext.emptyFn);
	},

    dropTable: function(tablename) {
       var me = this;
       
       me.getDb().transaction(function(tx) {
            
        var onError = function(tx, err) {
          me.throwDbError(tx, err);
        };
        
        var onSuccess = function(tx, results) {
        };
        
        var tablesql = 'DROP TABLE ' + me.getDbConfig().tablename;
        tx.executeSql(tablesql,[],onSuccess,onError);
       });
    },

	getDbFields: function () {
		var me = this,
				m = me.getModel(),
				fields = m.getFields().items,
				retFields = [];

		Ext.each(fields, function (f) {

			if ((f.config.persist || !Ext.isDefined(f.config.persist)) &&
					(f.getName() != m.getIdProperty())) {
				var name = f.getName(),
						type = f.config.type,
						option = (f.config.fieldOption) ? f.config.fieldOption : '';

				type =
						type.replace(/int/i, 'INTEGER')
								.replace(/float/i, 'FLOAT')
								.replace(/string/i, 'TEXT')
								.replace(/array/i, 'TEXT')
								.replace(/object/i, 'TEXT')
								.replace(/date/i, 'DATETIME');

				retFields.push({
					name: name,
					type: type,
					option: option,
					field: f
				});
			}
		});

		return retFields;
	},

	getFieldDefinition: function (f) {
		var field = f.name + ' ' + f.type;
		if (!Ext.isEmpty(f.option)) field += ' ' + f.option;
		return field;
	},

	constructFields: function () {
		var me = this,
				fields = me.getDbFields(),
				flatFields = [];

		Ext.each(fields, function (f) {

			flatFields.push(me.getFieldDefinition(f));
		});

		return flatFields.join(', ');
	},

	getRecordDbObject: function (record) {
		var me = this,
				fields = me.getDbFields(),
				recObj = {};

		Ext.each(fields, function (f) {
			if (Ext.isDefined(record.get(f.name))) {

				var value = record.get(f.name);

				// need to encode?
				if (f.field.getType().type.toUpperCase() == 'AUTO') {
					value = Ext.encode(value);
				}

				recObj[f.name] = value;
			}
		});

		return recObj;
	},

	transactionDB: function (dbConn, queries, successcallback, errorcallback, callback) {
		var me = this;
		dbConn.transaction(function (tx) {
			if (typeof callback == 'function') {
				callback.call(scope || me, results, me);
			}

			Ext.each(queries, function (query) {
				query(tx);
			});

		}, errorcallback, successcallback);

	},


	/* HELPERS FOR READING */

	whereClause: function (filters) {
		var me = this,
				firstFilter = true,
				sql = '',
				fieldTypes = {};

		Ext.each(me.getDbFields(), function (f) {
			fieldTypes[f.name] = f.type;
		});

		Ext.each(filters, function (filter) {
			// need to make sure this property is in the database
			if (!Ext.isDefined(fieldTypes[filter.getProperty()]))
				return;

			if (!firstFilter) sql += "\n  AND";
			else sql += "\nWHERE\n     ";
			firstFilter = false;

			sql += ' `' + filter.getProperty() + '`';

			// now: do we use like or =?
			var fieldType = fieldTypes[filter.getProperty()].toUpperCase();

			if(typeof filter.getFilterFn() == 'string'){
				sql += " " + filter.getFilterFn();
			}else{
				if (fieldType == 'TEXT' &&
						!filter.getCaseSensitive()) sql += ' LIKE';
				else sql += ' =';
			}

			// need to surround with %?
			if (!filter.getExactMatch() &&
					fieldType == 'TEXT') {
				sql += " '%" + filter.getValue() + "%'";
			} else if (fieldType == 'TEXT') {
				sql += " '" + filter.getValue() + "'";
			} else if (fieldType == 'boolean') {
				if (filter.getValue()) {
					sql += " 'true'";
				}
				else {
					sql += " 'false'";
				}
			} else {
				sql += ' ' + filter.getValue();
			}
		});

		return sql;
	},

	orderClause: function (sorters) {
		var me = this,
				sql = '',
				orders = [],
				fields = {},
				firstOrder = true;

		Ext.each(me.getDbFields(), function (f) {
			fields[f.name] = true;
		});

		Ext.each(sorters, function (order) {
			// need to make sure this property is in the database
			if (!Ext.isDefined(fields[order.getProperty()]))
				return;

			// root config not compatible here
			if (order.getRoot() != null)
				return;

			// only accept ASC, DESC for direction
			if (order.getDirection() != 'ASC' && order.getDirection() != 'DESC')
				return;

			if (!firstOrder) sql += ",\n  ";
			else sql += "\nORDER BY\n  ";
			firstOrder = false;

			sql += "`" + order.getProperty() + "` " + order.getDirection();
		});

		return sql;
	},
	groupClause:function(groups){
		var me = this,
				sql = '',
				fields = {},
				firstGroup = true;

		Ext.each(me.getDbFields(), function (f) {
			fields[f.name] = true;
		});

		Ext.each(groups, function (group) {
			// need to make sure this property is in the database
			if (!Ext.isDefined(fields[group.getProperty()]))
				return;

			// root config not compatible here
			if (group.getRoot() != null)
				return;

			if (!firstGroup) sql += ",\n  ";
			else sql += "\nGROUP BY\n  ";
			firstGroup = false;

			sql += "`" + group.getProperty() + "`";
		});

		return sql;
	},
	limitClause: function (limit, start) {
		var sql = "\nLIMIT";
		if (start != null) sql += ' ' + start + ',';
		if (limit != null) sql += ' ' + limit;
		return sql;
	},

	parseData: function (tx, rs) {

		var rows = rs.rows,
				data = [],
				i = 0;

		for (; i < rows.length; i++) {
			data.push(rows.item(i));
		}
		return data;
	},

	applyData: function (data, operation, callback, scope) {
		var me = this;

		operation.setSuccessful();
		operation.setCompleted();

		operation.setResultSet(Ext.create('Ext.data.ResultSet', {
			records: data,
			total: data.length,
			loaded: true
		}));

		// finish with callback
		operation.setRecords(data);

		if (typeof callback == "function") {
			callback.call(scope || me, operation);
		}
	},

	applyDataToModel: function (tx, results, operation, callback, scope) {

		var me = this,
				Model = me.getModel(),
				fields = Model.getFields().items;
		var records = me.parseData(tx, results);
		var storedatas = [];

		if (results.rows && records.length) {
			for (i = 0; i < results.rows.length; i++) {
				var rowid = records[i].rowid;
				var record = {};
				Ext.each(fields, function (f) {
					if (f.getType().type.toUpperCase() == 'AUTO') {
						record[f.getName()] =
								Ext.decode(Ext.isDefined(records[i][f.getName()])
										? records[i][f.getName()] : null);
					} else {
						record[f.getName()] =
								Ext.isDefined(records[i][f.getName()])
										? records[i][f.getName()] : null;
					}
				});

				storedatas.push(new Model(record, rowid));
			}
		}

		me.applyData(storedatas, operation, callback, scope);
	},


	/* FUNCTIONS THAT RETURN FUNCTIONS TO BE CALLED IN TRANSACTIONS */

	getInsertRecordFunc: function (record, tablename) {

		var me = this,
				rawData = me.getRecordDbObject(record),
				fields = [],
				values = [],
				placeholders = [],

				onSuccess = function (tx, rs) {
					var insertId = rs.insertId;

					if (record.phantom) {
						record.phantom = false;
					}

					// set the id
					record.setId(insertId);
				},

				onError = function (tx, err) {
					me.throwDbError(tx, err);
				};

		//extract data to be inserted
		for (var i in rawData) {
			fields.push(i);
			values.push(rawData[i]);
			placeholders.push('?');
		}

		var sql = 'INSERT INTO ' + tablename + '(' + fields.join(',') +
				') VALUES (' + placeholders.join(',') + ')';

		return function (tx) {
			tx.executeSql(sql, values, onSuccess, onError);
		};
	},

	getUpdateRecordFunc: function (record, tablename) {

		var me = this,
				id = record.getId(),
				newData = me.getRecordDbObject(record),
				pairs = [],
				values = [],

				onSuccess = function (tx, rs) {
					//add new record if id doesn't exist
					if (rs.rowsAffected == 0) {
						me.getInsertRecordFunc(record, tablename)(tx);
					}
				},

				onError = function (tx, err) {
					me.throwDbError(tx, err);
				};

		for (var i in newData) {
			pairs.push(i + ' = ?');
			values.push(newData[i]);
		}

		values.push(record.getId());

		var sql = 'UPDATE ' + tablename + ' SET ' + pairs.join(',') +
				' WHERE _ROWID_ = ?';

		return function (tx) {
			tx.executeSql(sql, values, onSuccess, onError);
		};

	},

	getDeleteRecordFunc: function (record, tablename) {
		var me = this,
				values = [],
				onSuccess = function (tx, rs) {
				},

				onError = function (tx, err) {
					me.throwDbError(tx, err);
				};

		var sql = 'DELETE FROM ' + tablename + ' WHERE _ROWID_ = ?';
		values.push(record.getId());

		return function (tx) {
			tx.executeSql(sql, values, onSuccess, onError);
		};
	},

	applyGrouper: function(groups) {
		var appliedGroups = [];
		if(groups) {
			if(!Ext.isArray(groups)) groups = [groups];
			Ext.each(groups, function(group){
				if (typeof group == 'string') {
					group = {
						property: group
					};
				}
				appliedGroups.push(Ext.factory(group, Ext.util.Grouper));
			});
		}
		return appliedGroups;
	},

	applyFilters: function(filters){
		var appliedFilters = [];
		if(filters) {
			if(!Ext.isArray(filters)) filters = [filters];

			Ext.each(filters, function(filter){
				appliedFilters.push(Ext.factory(filter, Ext.util.Filter));
			});
		}
		return appliedFilters;
	},

	applySorters: function(sorters){
		var appliedSorters = [];
		if(sorters) {
			if(!Ext.isArray(sorters)) sorters = [sorters];

			Ext.each(sorters, function(sorter){
				appliedSorters.push(Ext.factory(sorter, Ext.util.Sorter));
			});
		}
		return appliedSorters;
	}

});


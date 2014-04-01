* 2014/04/01 UPDATE *

A while back, Sencha included a Sql proxy with the touch framework.

For the most part, it does a really good job but the support for array or object fields is not yet there.

Please checkout my override at https://github.com/shepsii/SQL-Proxy-Override-ST2 for this support.

Otherwise, please consider this repo deprecated!

* 2012/05/14 SENCHA COMMAND COMPATIBILITY *

An issue with the demo app not working when it's been built into production or testing (ie, into a single js file) has been sorted.

It's a fix that works; for some reason when Sencha is in a single file the models will be initiated and their proxies created BEFORE the onReady method of the Ext.Application call is executed. In a pre-build, multi-file development environment, the model calls are after.

NB: I have also changed the Ext.Loader.SetPath call in the app.js of the demo so the source code for the sqliteproxy is only included once in the root of the repository (rather than twice - ie, it's no longer copied in the demo directory).


* 2012/05/04 SCHEMA MODIFICATION *

A quick note on page sizes - because this proxy does do "remote filtering", ie, altering the query to the database if remoteFilter is set to true, it also takes notice of the pageSize config (which I believe defaults to 24). So if you do not want to use pageSize, set it to some arbitrary large number that will be larger than the number of records of the relevant model.

The proxy now includes primitive handling for changing the fields on a model.

New fields added to a model with be detected on app startup, and the appropriate column will be added to the existing Sqlite table. If the field has a defaultValue then this will be set for all records already in the database.

If a model has zero data already in the database, on app startup the table will be recreated. Obviously as soon as the database is populated, this doesn't happen.

Removed fields do NOT have their columns removed from the database. This is due to a lack of REMOVE COLUMN command in Sqlite. There is no drawback to this outside of having redundant data remain in the database.

Fields that have had their type altered will NOT be updated in the database. Again there is no facility within Sqlite to alter the type of a column. A drawback here is the types that Sencha Touch work with may not lineup with the database, meaning that values will not be consistent across loads, after a field's type has changed. I would strongly advise renaming a field if its type is changed.

Finally, if you're making large changes to a model from one version of the app to another, and wish for the data to persist across versions, I would recommend the following:
- change the table name on the proxy's db config
- on a relevant controller or on the application, within the init function create a new store, that uses as its proxy the OLD table name
- load data from this store, adjust it to fit the new model config, and then add each record into the new store
- sync the new store
- remove all data from the "old table" store and sync to the database

The next targets remain associations, store/record member recording and a working example for iOS5.1 with the newest PhoneGap version.


* 2012/04/16 PREVIEW RELEASE *

I was playing around with the proxy tomalex0 put together (http://www.sencha.com/forum/showthread.php?151444-SqliteProxy-for-ST2) and started to make a number of changes that I think others may find useful.

A massive amount of credit goes to Thomas for starting off the proxy and I release this sneak preview version, based on his code, with his permission. This code is currently still in development, but I've got to a point now where I'm using it in development of an app and only modify the proxy as and when I see the need to, so it will not be complete for a while - hence the release now. It is fully functional, just needs cleaning up and a couple of optimisations.

Note this is a true SQLite proxy, not a WebSQL proxy. This will be persistant across iOS5.1 hybrid app loads if you use the sqlite plugin for PhoneGap and the most recent PhoneGap version.

Here is a list of how it differs from the original proxy:

- cooperates with Ext.Loader

- exists cleanly outside of the ST src directory

- operations not marked completed and successful/error until the db transaction has completed, so you can listen to the operation and act on its completion knowing that the db transaction has finished

- some queries are grouped into a single transaction to massively increase db performance, as opposed to one transaction per single query.

- more closely mimics ST2's webstorage proxy. By this I mean that for the most part, this proxy is considered "local", not "client" or "server"-side (with one notable exception which I'll expand upon shortly). You can bring up any of the ST2 demos that use localstorage, change the proxy to sqlitestorage (and specify a table name as in the included sqlitedemo app) and the app will work the same. So you could use it in conjunction with, say, server side data which you sync to the app and save locally so the app can be used offline.

- remote filtering and sorting is supported on the proxy. This is where the word "remote" in facts means "the sqllite database". So adding filters and sorts will modify the query that the proxy uses against the sqlite db; very useful if you're handling large datasets. Make sure to add a page size to the store.

- uses sqlite's "hidden" __ROWID__ to handle the IDs of each record. You just need to add an integer field called "id" to each model. 

- supports fields where persist is set to false in the config - won't save these to the database.

- I removed Tom's debugging console logs

- Supports array and object types on models - I've found this amazingly useful. The proxy just encodes the fields to JSON same as localstorage and saves them in a text row.

Sorry for no readme in the repo, all the info you need should be in this post. I've included a quick demo app.

Note that if you edit the fields in your models, you will need to manually remove the table from the sqlite db before you restart the app (use webkit's developer kit: resources -> databases -> click on db name, type "DROP TABLE tbl_name").

Obviously a good target from here is to get the proxy working with associations, which it currently doesn't. So steer clear! But then, neither does localstorage in ST2 so I'd like so see Sencha's implementation of that before I mimic it for this proxy. Also no store/record association is currently saved; you'll need to add store_id fields to the record config if you want them to only belong to specific stores.
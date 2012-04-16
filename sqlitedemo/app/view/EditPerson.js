Ext.define("SqliteDemo.view.EditPerson", {
  extend: 'Ext.form.Panel',
  requires: ['Ext.form.FieldSet', 'Ext.field.Text'],
  xtype: 'sqlitedemo-editperson',
  
  config: {
    layout: 'vbox',
    items: [
    {
      xtype: 'fieldset',
      items: [
      {
        xtype: 'textfield',
        label: 'Name',
        name: 'name'
      }
      ]
    },
    {
      xtype: 'button',
      ui: 'confirm',
      text: 'Save',
      itemId: 'saveBtn'
    }
    ]
  }
});

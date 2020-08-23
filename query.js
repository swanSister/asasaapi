
var dbconfig   = require('./config/database.js');
//var mysql      = require('mysql');
const mysql = require(`mysql-await`)
const connection = mysql.createConnection(dbconfig)
 
connection.on(`error`, (err) => {
  console.error(`Connection error ${err.code}`)
});
 

module.exports = async function (sql) {
  try{
    let res = await connection.awaitQuery(sql)
    connection.destroy()
    connection = mysql.createConnection(dbconfig)
    return {success:true, data:res}
  }catch(e){
      console.log('Query Error', e)
      connection.destroy()
      connection = mysql.createConnection(dbconfig)
			return {success:false, errorMessage:e}
  }
  
};
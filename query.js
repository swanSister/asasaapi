
var dbconfig   = require('./config/database.js');
//var mysql      = require('mysql');
const mysql = require(`mysql-await`)

const connection;
function handleDisconnect() {
    connection = mysql.createConnection(dbConfig);  // Recreate the connection, since the old one cannot be reused.
    connection.connect( function onConnect(err) {   // The server is either down
        if (err) {                                  // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 10000);    // We introduce a delay before attempting to reconnect,
        }                                           // to avoid a hot loop, and to allow our node script to
    });                                             // process asynchronous requests in the meantime.
                                                    // If you're also serving http, display a 503 error.
    connection.on('error', function onError(err) {
        console.log('db error', err);
        if (err.code == 'PROTOCOL_CONNECTION_LOST') {   // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                        // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}
handleDisconnect();

module.exports = async function (sql) {
  try{
    let res = await connection.awaitQuery(sql)
    return {success:true, data:res}
  }catch(e){
      console.log('Query Error', e)
  
			return {success:false, errorMessage:e}
  }
  
};
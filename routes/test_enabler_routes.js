'use strict';

var passport = require('passport');

let knex = require('../db/knex');


module.exports = function (router, controller) {


    router.get('/xyz', passport.authenticate('jwt'), function (req, res, next) {
      //console.log('OMG:::'+req.session.id);		
      console.log(req.user);
      return res.json({ message: 'new test and dev route', user: req.user });
    });

    function points(type, count) {

      if (type == 3)
        return count;
      else if (type == 4)
        return count + 1;
      else if (type == 5)
        return count + 1;
      else if (type == 6)
        return count + 1;
      else if (type == 7)
        return count + 2;
      else if (type == 8)
        return count + 3;
      else if (type == 9)
        return count + 2;
      else if (type == 10)
        return count + 2;
      else if (type == 11)
        return count + 3;
      else if (type == 12)
        return count + 2;
      else if (type == 13)
        return count + 2;
      else if (type == 14)
        return count + 3;
      else if (type == 15)
        return count + 3;
      else if (type == 16)
        return count + 3;
      else if (type == 17)
        return count + 4;
      else if (type == 0)
        return count + 1;
      else
        return 0;
    }

    function coins(type, count) {

      if (type == 3)
        return 1;
      else if (type == 4)
        return 1;
      else if (type == 5)
        return 2;
      else if (type == 6)
        return 1;
      else if (type == 7)
        return 2;
      else if (type == 8)
        return 3;
      else if (type == 9)
        return 2;
      else if (type == 10)
        return 5;
      else if (type == 11)
        return 6;
      else if (type == 12)
        return 2;
      else if (type == 13)
        return 6;
      else if (type == 14)
        return 7;
      else if (type == 15)
        return 3;
      else if (type == 16)
        return 7;
      else if (type == 17)
        return 8;
      else if (type == 0)
        return 0;
      else
        return 0;
    }

    function getJewelProbablityArray(jewels) {

      let len = jewels.length;
      let jp = JSON.parse(JSON.stringify(jewels));

      for (let i = 0; i < len; i++) {
        jewels.pop();
        jp = jp.concat(jewels)
      }

      console.log(jp);
      return jp;
    }

  router.get('/generateTasks', function (req, res, next) {

    console.log('START');

    let tasks = [], taskdetails = [];


    //let jj = getJewelProbablityArray([3,6,9,4,12,15])  // Visual MARKER

    let jj = getJewelProbablityArray([4,5,7,8,10,11,13,14,16,17])  // Visual MARKER


    //let jj = getJewelProbablityArray([11, 14, 17])  // Visual MARKER



    for (let k = 101; k <= 200; k++) {  // Visual MARKER

      //console.log('First loop START');

      //jj = [3,6,9,12,15,3,6,9,12,15,3,6,9,12,15,3,6,9,12,15,3,6,9,12,15,3,6,9,12,15,0,4,7,5,8,10,4,7,5,8,10,4,7,5,8,10,4,7,5,8,10,11,13,14,16,17,11,13,14,16,17,0];

      let jt = [];


      let loop = Math.floor(Math.random() * (3 - 1 + 1)) + 1;

      let sump = 0, sumc = 0, summ = 0; let materials = [];

      for (let i = 1; i <= loop; i++) {

        //console.log('2nd loop START');

        let flag = true; let t = 0;

        while (flag) {

          t = Math.floor(Math.random() * (jj.length - 1 + 1)) + 1;
          flag = false;
          for (let j = 0; j < jt.length; j++) {
            if (jt[j] == jj[t - 1]) {
              flag = true;
              break;
            }

          }

          jt.push(jj[t - 1]);

        }

        let c = 0;

        if (jj[t - 1] == 0)
          c = 1;
        else if (jj[t - 1] == 15 || jj[t - 1] == 16 || jj[t - 1] == 17)
          c = Math.floor(Math.random() * (10 - 5 + 1)) + 5;// Math.floor(Math.random() * (2 - 1 + 1)) + 1;
        else if (jj[t - 1] == 12 || jj[t - 1] == 13 || jj[t - 1] == 14)
          c = Math.floor(Math.random() * (10 - 5 + 1)) + 5; // Math.floor(Math.random() * (3 - 1 + 1)) + 1;
        else if (jj[t - 1] == 9 || jj[t - 1] == 10 || jj[t - 1] == 11)
          c = Math.floor(Math.random() * (10 - 5 + 1)) + 5; //Math.floor(Math.random() * (5 - 1 + 1)) + 1;
        else
          c = Math.floor(Math.random() * (7 - 1 + 1)) + 1;

        sump += points(jj[t - 1], c);
        sumc += coins(jj[t - 1], c);

        //materials.push([ jj[t-1], c])  

        console.log('j' + jj[t - 1] + ' ---> ' + c);

        taskdetails.push({ task_id: k, jeweltype_id: jj[t - 1], count: c })

      }

      if (sump + sumc > 100) {
        let x = sump + sumc - 100;
        summ = Math.floor(x / 25) * 0.25;
      } else
        summ = 0.00;

      console.log("Points:" + sump + "    Coins:" + sumc);

      tasks.push({ id: k, points: sump, coins: sumc });

      console.log("_________________________________________________");

    }


    knex.transaction(trx => {

      knex('tasks').insert(tasks).transacting(trx)
        .then(() => {

          return knex.table('taskdetails').insert(taskdetails).transacting(trx);

        })
        .then(trx.commit)
        .catch(trx.rollback);

    })
    .then(values => {
      console.log(values);
    })
    .catch(err => {
      console.log(err);
    });


    return res.json({ error: false });


  });




    function bombpoints(type, count) { 
      
      if (type == 10)
        return count * -2;
      else if (type == 11)//
        return count * -4;  
      else if (type == 13)
        return count * -2;
      else if (type == 14)//
        return count * -5;  
      else if (type == 16)
        return count * -3;
      else if (type == 17)//
        return count * -6;
      else if (type == 0)
        return count * -10;
      else
        return 0;

    }


    router.get('/generateBombTasks', function (req, res, next) {

      console.log('START');

      let tasks = [], taskdetails = [];


      //let jj = getJewelProbablityArray([3,6,9,4,12,15])  // Visual MARKER

      let jj = getJewelProbablityArray([17,14,11,0,16,13,10])  // Visual MARKER
      //let jj = getJewelProbablityArray([16,13,10,0])  // Visual MARKER


      for (let k = 61; k <= 100; k++) {  // Visual MARKER

        //console.log('First loop START');

        //jj = [3,6,9,12,15,3,6,9,12,15,3,6,9,12,15,3,6,9,12,15,3,6,9,12,15,3,6,9,12,15,0,4,7,5,8,10,4,7,5,8,10,4,7,5,8,10,4,7,5,8,10,11,13,14,16,17,11,13,14,16,17,0];

        let jt = [];


        let loop = Math.floor(Math.random() * (3 - 1 + 1)) + 1;

        let sump = 0, sumc = 0, summ = 0; let materials = [];

        for (let i = 1; i <= loop; i++) {

          //console.log('2nd loop START');

          let flag = true; let t = 0;

          while (flag) {

            t = Math.floor(Math.random() * (jj.length - 1 + 1)) + 1;
            flag = false;
            for (let j = 0; j < jt.length; j++) {
              if (jt[j] == jj[t - 1]) {
                flag = true;
                break;
              }

            }

            jt.push(jj[t - 1]);

          }

          let c = 0;

          if (jj[t - 1] == 0)
            c = c = Math.floor(Math.random() * (10 - 5 + 1)) + 5;
          else if (jj[t - 1] == 15 || jj[t - 1] == 16 || jj[t - 1] == 17)
            c = Math.floor(Math.random() * (10 - 5 + 1)) + 5;// Math.floor(Math.random() * (2 - 1 + 1)) + 1;
          else if (jj[t - 1] == 12 || jj[t - 1] == 13 || jj[t - 1] == 14)
            c = Math.floor(Math.random() * (10 - 5 + 1)) + 5; // Math.floor(Math.random() * (3 - 1 + 1)) + 1;
          else if (jj[t - 1] == 9 || jj[t - 1] == 10 || jj[t - 1] == 11)
            c = Math.floor(Math.random() * (10 - 5 + 1)) + 5; //Math.floor(Math.random() * (5 - 1 + 1)) + 1;
          else
            c = Math.floor(Math.random() * (7 - 1 + 1)) + 1;

          sump += bombpoints(jj[t - 1], c);
          sumc = 0;

          //materials.push([ jj[t-1], c])  

          console.log('j' + jj[t - 1] + ' ---> ' + c);

          taskdetails.push({ task_id: k, jeweltype_id: jj[t - 1], count: c })

        }

        

        console.log("Points:" + sump + "    Coins:" + sumc);

        tasks.push({ id: k, points: sump, coins: sumc });

        console.log("_________________________________________________");

      }


      knex.transaction(trx => {

        knex('tasks').insert(tasks).transacting(trx)
          .then(() => {

            return knex.table('taskdetails').insert(taskdetails).transacting(trx);

          })
          .then(trx.commit)
          .catch(trx.rollback);

      })
      .then(values => {
        console.log(values);
      })
      .catch(err => {
        console.log(err);
      });


      return res.json({ error: false });


    });


}


////////////////////////////////////////////////////////////////////
// Routing
//

var filters = {

  /**
   * ensure user is logged in 
   */
  authenticate: function (pause) {
    var user;
    console.log('authenticate:');
    Meteor.subscribe('users');
    if (Meteor.loggingIn()) {
      this.render('loading');
    } 
    else {
      user = Meteor.user();
      if (user) { 
       this.next(); 
       }
       else {
        console.log('filter: signin');
        this.render('signin');
        };
   };
 }, 
 // force CAS auth
 forcecas: function (pause) {
     Meteor.loginWithCas();
     Router.go('start');
     return;
 },
 wait: function () {
      this.render('loading');
      this.subscribe('messages').wait();
      this.subscribe('vlans').wait();
      this.subscribe('configs').wait();
      this.next();
 }
};


Router.configure({
//  layout: 'start',
  loadingTemplate: 'loading',
  notFoundTemplate: 'not_found',
});


Router.map(function () {
  this.route('start', {
    path: '/',
    onBeforeAction: [filters.authenticate,filters.wait],
//    data: function() {return Vlans.find()}
  });
  this.route('/api/vlans/createorupdate', function() {
    var token = this.request.headers['x-auth-token'];
    var data = this.request.body;
    var extId = data['id'];
    var nom = data.nom;
    var content = data.content;
    var owners = data.owners;
    check(extId, String);
    check(nom, String);
    check(content, String);
    check(owners, Array);

    var vlan = Vlans.findOne({'extId': extId});

    var response;
    if (vlan) {
      response = 'update';
      Vlans.update({
        "_id": vlan._id }, {
        $set: {
           "nom": nom,
           "content" : content,
           "owners" : owners,
           "modified": new Date,
           "modifiedBy": 'REST@api'
        }} ,{"getAutoValues": false} );
    }
    else {
      response = 'create';
      Vlans.insert({
           "nom": nom,
           "extId": extId,
           "content" : content,
           "owners" : owners,
           "created": new Date,
           "createdBy": 'REST@api'
        },{"getAutoValues": false});
    };
    this.response.statusCode = 200;
    this.response.setHeader("Content-Type", "application/json");
    this.response.setHeader("Access-Control-Allow-Origin", "*");
    this.response.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    this.response.end(response + ' ...  ' + extId + ' ' + token
     + '------------------' +  JSON.stringify(
     this.request.body['owners']
    )
   );
  }, {where: 'server'});
  // url to force a CAS auth
  this.route('cas', {
    path: '/cas',
    onBeforeAction: [filters.forcecas,filters.wait]
  });
  this.route('admin', {
    onBeforeAction: [filters.authenticate,filters.wait]
  });
  this.route('config', {
    path: '/config',
    onBeforeAction: [filters.authenticate,filters.wait],
    data: function() {return Configs.find({}, {sort: {rank: 1}})}
  });
 this.route('ViewAcl', { 
      path: '/viewacl/:_id',
      onBeforeAction: [filters.authenticate,filters.wait],
      data: function() { 
           Session.set('waiting', false);
           return Vlans.findOne({_id: this.params._id}); }
 });
});

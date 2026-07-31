/* Shared Firebase Realtime Database layer for the Cyber Sleuth Challenge.
   Used by both the presenter deck and quiz.html.
   Data model:  sleuth/{sessionCode}/
     state    { phase: lobby|question|reveal|final, q, startedAt, duration }
     players  { pid: { name, joined } }
     answers  { q1..q6: { pid: { letter, ms } } }
     results  { podium: [{name,score}], avg, players }
*/
window.SleuthLive = (function () {
  'use strict';
  var cfg = window.FIREBASE_CONFIG;
  var configured = !!(cfg && cfg.apiKey && cfg.apiKey.indexOf('PASTE_') === -1 && typeof firebase !== 'undefined');
  var db = null, offset = 0;
  if (configured) {
    try {
      firebase.initializeApp(cfg);
      db = firebase.database();
      db.ref('.info/serverTimeOffset').on('value', function (s) { offset = s.val() || 0; });
    } catch (e) {
      console.warn('Firebase init failed:', e);
      configured = false;
    }
  }
  return {
    configured: configured,
    ref: function (session, path) { return db.ref('sleuth/' + session + (path ? '/' + path : '')); },
    now: function () { return Date.now() + offset; },
    TS: function () { return firebase.database.ServerValue.TIMESTAMP; }
  };
})();

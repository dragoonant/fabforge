(function () { 'use strict'; const FAB = window.FAB;
  FAB.ai = { choose: function (s) { const l = FAB.legalActions(s); return l[0]; } };
})();

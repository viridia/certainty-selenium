var subjectFactory = require('certainty').subjectFactory;
var WebElementSubject = require('./lib/webElementSubject');
var webdriver = require('selenium-webdriver');

subjectFactory.addType(
  function (v) { return v instanceof webdriver.WebElement; },
  WebElementSubject
);

/** @module certainty-selenium */
var Subject = require('certainty/lib/subject/subject');
var DeferredSubject = require('certainty/lib/subject/deferredSubject');
var ProxyBase = require('certainty/lib/subject/proxy');
var format = require('certainty/lib/format');

/** A fluent context object containing the value of the field that was just tested. Used for
    additional assertions about a field.
    @constructor
  */
function AttributeValue(subject, name, value) {
  this.subject = subject;
  this.name = name;
  this.value = value;
}

/** Ensure that the field has the expected value.
    @param {*} value The expected value of the field.
*/
AttributeValue.prototype.withValue = function (expected) {
  if (this.value != expected) {
    this.subject.fail('Expected ' + this.subject.describe() + ' to have an attribute \'' +
      this.name + '\' with value ' + format(expected) + ', actual value was "' + this.value + '".');
  }
}
ProxyBase.addMethods(AttributeValue);

/** A class which functions as a subject, but doesn't actually execute any assertions until
    the promise has resolved. Once the promise succeeds, any method calls will be played back
    on the result value of the promise.
    @param {Subject} subject The parent subject that spawned this one.
    @param {Promise} promise The promise being tested.
    @param {string} description A description of the subject, based on the parent subject's
      description.
    @constructor
    @extends DeferredSubject
  */
function EventualSubject(subject, promise, description) {
  DeferredSubject.call(this);
  this.subject = subject;
  var self = this;
  this.promise = promise.then(
    function(value) {
      // Play back the recorded calls on a new subject which is created based on the resolved
      // value of the promise.
      var subjectFactory = require('certainty/lib/subject/factory');
      var valueSubject = subjectFactory.newSubject(subject.failureStrategy, value);
      valueSubject.named(description);
      valueSubject.failureMessage = subject.failureMessage;
      self.run(valueSubject);
      return value;
    },
    function(reason) {
      subject.fail('Failed to access ' + description + ' with error: ' + format(reason) + '.');
      return reason;
    }
  );
  // Make this object a thenable
  this.then = this.promise.then.bind(this.promise);
  this.catch = this.promise.catch.bind(this.promise);
}
EventualSubject.prototype = Object.create(DeferredSubject.prototype);
EventualSubject.prototype.constructor = DeferredSubject;

/** A class which functions as a subject for a deferred attribute lookup.
    @param {Subject} subject The parent subject that spawned this one.
    @param {Promise} promise The promise which resolves to the attribute value, or null.
    @param {string} description A description of the subject, based on the parent subject's
      description.
    @constructor
    @extends DeferredSubject
  */
function EventualAttribute(subject, attrName) {
  DeferredSubject.call(this);
  this.subject = subject;
  var self = this;
  this.promise = subject.value.getAttribute(attrName).then(
    function(value) {
      if (value == null) {
        subject.fail('Expected ' + subject.describe() + ' to have attribute ' + attrName + '.');
        return value;
      }
      // Play back the recorded calls on an attributeValue object.
      self.run(new AttributeValue(subject, attrName, value));
      return value;
    },
    function(reason) {
      subject.fail('Failed to access attribute \'' + attrName + '\' of ' + subject.describe() +
        ' with error: ' + format(reason) + '.');
      return reason;
    }
  );
  // Make this object a thenable
  this.then = this.promise.then.bind(this.promise);
  this.catch = this.promise.catch.bind(this.promise);
}
EventualAttribute.prototype = Object.create(DeferredSubject.prototype);
EventualAttribute.prototype.constructor = EventualAttribute;

/** Subclass of Subject which provides assertions methods for selenium-webdriver elements.
    @param {FailureStrategy} failureStrategy The failure strategy to use when an assertion fails.
    @param {object} value The value being checked.
    @constructor
    @extends Subject
*/
function WebElementSubject(failureStrategy, value) {
  Subject.call(this, failureStrategy, value);
}
WebElementSubject.prototype = Object.create(Subject.prototype);
WebElementSubject.prototype.constructor = WebElementSubject;

/** Return a string description of the subject. */
WebElementSubject.prototype.describe = function () {
  return this.name ? this.name : 'element';
};

/** Return a list of class names for the element.
    @return {Promise<Array>} List of classes.
*/
WebElementSubject.prototype.classList = function () {
  return this.value.getAttribute('class').then(function (classes) {
    if (classes) {
      return classes.split(/\s+/);
    }
    return [];
  });
};

/** Ensure that the element's 'class' attribute contains the specified CSS class name.
    @param {string} clsName The class.
    @return {Promise} A promise which is resolved when the test completes.
*/
WebElementSubject.prototype.hasClass = function (clsName) {
  var self = this;
  return this.classList().then(function(classes) {
    if (classes.indexOf(clsName) < 0) {
      self.failureStrategy.fail('Expected ' + self.describe() + ' to have class \'' +
        clsName + '\'.');
    }
  });
};

/** Ensure that the element's 'class' attribute does not contain the specified CSS class name.
    @param {string} clsName The class.
    @return {Promise} A promise which is resolved when the test completes.
*/
WebElementSubject.prototype.doesNotHaveClass = function (clsName) {
  var self = this;
  return this.classList().then(function(classes) {
    if (classes.indexOf(clsName) >= 0) {
      self.failureStrategy.fail('Expected ' + self.describe() + ' to not have class \'' +
        clsName + '\'.');
    }
  });
};

/** Return a StringSubject for the element's text.
    @return {Subject} A StringSubject which can be used to do assertions on the text of the element.
*/
WebElementSubject.prototype.text = function () {
  return new EventualSubject(this, this.value.getText(), 'text of ' + this.describe());
};

/** Return a StringSubject for the element's id.
    @return {Subject} A subject which can be used to do assertions on the id of the element.
*/
WebElementSubject.prototype.id = function () {
  return new EventualSubject(this, this.value.getAttribute('id'), 'id of ' + this.describe());
};

/** Return an ArraySubject for the list of the element's classes.
    @return {Subject} A subject which can be used to do assertions on the classes of the element.
*/
WebElementSubject.prototype.classes = function () {
  return new EventualSubject(this, this.classList(), 'classes of ' + this.describe());
};

/** Return a StringSubject for the element's tag name.
    @return {Subject} A StringSubject which can be used to do assertions on the tag name of the
        element.
*/
WebElementSubject.prototype.tagName = function () {
  return new EventualSubject(this, this.value.getTagName(), 'id of ' + this.describe());
};

/** Return a StringSubject for an attribute of the element.
    @param {string} attrName The name of the attribute.
    @return {Subject} A StringSubject which can be used to do assertions on the tag name of the
        element.
*/
WebElementSubject.prototype.attribute = function (attrName) {
  return new EventualSubject(this, this.value.getAttribute(attrName), 'attribute \'' + attrName +
    '\' of ' + this.describe());
};

/** Ensure that the element is currently displayed.
    @return {Promise} A promise which is resolved when the test completes.
*/
WebElementSubject.prototype.isDisplayed = function () {
  var self = this;
  return this.value.isDisplayed().then(function(displayed) {
    if (!displayed) {
      self.failureStrategy.fail('Expected ' + self.describe() + ' to be displayed.');
    }
  });
};

/** Ensure that the element is currently not displayed.
    @return {Promise} A promise which is resolved when the test completes.
*/
WebElementSubject.prototype.isNotDisplayed = function () {
  var self = this;
  return this.value.isDisplayed().then(function(displayed) {
    if (displayed) {
      self.failureStrategy.fail('Expected ' + self.describe() + ' to not be displayed.');
    }
  });
};

/** Ensure that the element contains a given attribute.
    @param {string} attrName The name of the attribute.
    @return {EventualAttribute} The fluent context for the attribute, supports a 'withValue'
      assertion.
*/
WebElementSubject.prototype.hasAttribute = function (attrName) {
  return new EventualAttribute(this, attrName);
};

/** Ensure that the element does not contains a given attribute.
    @param {string} attrName The name of the attribute.
    @return {Promise} A promise which is resolved when the test completes.
*/
WebElementSubject.prototype.doesNotHaveAttribute = function (attrName) {
  return this.value.getAttribute(attrName).then(function (value) {
    if (value !== null) {
      self.failureStrategy.fail('Expected ' + self.describe() + ' to not have attribute named "' +
        attrName + '".');
    }
  });
};

/** Ensure that the element has a 'disabled' attribute.
    @return {Promise} A promise which is resolved when the test completes.
*/
WebElementSubject.prototype.isDisabled = function () {
  return this.value.getAttribute('disabled').then(function (value) {
    if (value === null) {
      self.failureStrategy.fail('Expected ' + self.describe() + ' to have a "disabled" attribute.');
    }
  });
};

/** Ensure that the element does not have a 'disabled' attribute.
    @return {Promise} A promise which is resolved when the test completes.
*/
WebElementSubject.prototype.isNotDisabled = function () {
  return this.value.getAttribute('disabled').then(function (value) {
    if (value !== null) {
      self.failureStrategy.fail('Expected ' + self.describe() +
        ' to not have a "disabled" attribute.');
    }
  });
};

/** Ensure that the element has a 'checked' attribute.
    @return {Promise} A promise which is resolved when the test completes.
*/
WebElementSubject.prototype.isChecked = function () {
  return this.value.getAttribute('checked').then(function (value) {
    if (value === null) {
      self.failureStrategy.fail('Expected ' + self.describe() + ' to have a "checked" attribute.');
    }
  });
};

/** Ensure that the element does not have a 'checked' attribute.
    @return {Promise} A promise which is resolved when the test completes.
*/
WebElementSubject.prototype.isNotChecked = function () {
  return this.value.getAttribute('checked').then(function (value) {
    if (value !== null) {
      self.failureStrategy.fail('Expected ' + self.describe() +
        ' to not have a "checked" attribute.');
    }
  });
};

module.exports = WebElementSubject;

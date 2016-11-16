# Certainty-Selenium

## Introduction

**Certainty-Selenium** extends the [Certainty](https://github.com/viridia/certainty) assertion
library with assertion methods for Selenium Webdriver elements.

Example:

```javascript
import { ensure } from 'certainty';
import 'certainty-selenium';

// Assert that the given element has the expected classes.
it('should have expected classes', function () {
  return driver.findElement(By.css('#my-element')).then((element) => {
    ensure(element).hasClass('enabled');
    ensure(element).doesNotHaveClass('visible');
    // Assertion returns a promise which we can return to Mocha.
    return ensure(element).doesNotHaveClass('selected');
  });
})
```

The certainty-selenium assertion methods are designed to work with the
asynchronous Selenium-Webdriver APIs which all return promises. The Selenium
framework uses a hidden global promise chain, so each Selenium API call will
wait until the previous API call has completed. This means that you don't have
to fuss with complex promise chains, you can just put the assertions one after
another.

However, you'll need to make sure to wait for the very last API call in a test
case.

To make this easier, the certainty assertion methods return a promise which
resolves when the assertion is finished. If you are using Mocha, you can simply
return the value from the `ensure()` call from your test case. If the assertions
are themselves inside a promise handler, then you'll need to ensure that both
the inner block and the outer block return a promise (see the example above).
Alternatively, you can simply call Mocha's done() callback after your last
assertion:

```javascript
// Assert that the given element has the expected classes.
it('should have expected classes', function (done) {
  driver.findElement(By.css('#my-element')).then((element) => {
    ensure(element).hasClass('enabled');
    ensure(element).doesNotHaveClass('visible');
    ensure(element).doesNotHaveClass('selected').then(() => done());
  });
})
```

## WebElement assertions

Calling `ensure()` with a Selenium WebElement object will return a
`WebElementSubject` which contains useful assertion methods for web elements.

The methods `text`, `id`, `tagName`, and `attribute(name)` each return a
deferred StringSubject that supports all of the regular assertion methods for
strings. This is a deferred subject because the assertion methods don't actually
execute immediately, but instead wait for the Selenium promise to resolve before
actually performing the assertion.

Similarly, the `classes` method returns a deferred ArraySubject that contains
a list of all the class names for that element.

```javascript
// Examples of assertions on the inner text of an element.
ensure(webElement).text().equals(someText);
ensure(webElement).text().startsWith(somePrefix);
ensure(webElement).text().includes(someText);

ensure(webElement).id().equals(someId);
ensure(webElement).tagName().equals(tagName);
ensure(webElement).attribute(attrName).equals(value);
ensure(webElement).classes().contains(clsName);
```

In addition, there are various shortcut methods that work specifically on
attributes and classes:

```javascript
ensure(webElement).hasAttribute(attrName).withValue(value);
ensure(webElement).hasClass(clsName);
ensure(webElement).doesNotHaveClass(clsName);
ensure(webElement).doesNotHaveAttribute(attrName);
ensure(webElement).isDisabled();
ensure(webElement).isNotDisabled();
ensure(webElement).isChecked();
ensure(webElement).isNotChecked();
```

And there are assertion methods that test whether an element is displayed:

```javascript
ensure(webElement).isDisplayed();
ensure(webElement).isNotDisplayed();
```

## Road map

There are a lot more methods in the Selenium-Webdriver API that could be
leveraged, such as the various findElement() calls. I'd be interested in any
feedback that folks have as to what kinds of things would be the most useful.

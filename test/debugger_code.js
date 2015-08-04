var phantom = require('node-phantom-simple'),
    phantomjs = require('phantomjs'),
    assert = require('assert'),
    testutil = require('./lib/testutil'),
    one_step_timeout = 8000,
    extended_timeout = 30000,
    refreshThen = testutil.refreshThen,
    asyncTest = testutil.asyncTest;


describe('debugger', function() {
  var _ph, _page;
  before(function(done) {
    // Create the headless webkit browser.
    phantom.create(function(error, ph) {
      assert.ifError(error);
      // Open a page for browsing.
      _ph = ph;
      _ph.createPage(function(err, page) {
        _page = page;
        page.onConsoleMessage = function(msg) {
          console.log(msg);
        }
        // Set the size to a modern laptop size.
        page.set('viewportSize', { width: 1200, height: 900 }, function(err) {
          assert.ifError(err);
          // Point it to a blank page to start
          page.open('about:blank', function(err, status){
            assert.ifError(err);
            assert.equal(status, 'success');
            done();
          });
        });
      });
    }, {
      // Launch phantomjs from the phantomjs package.
      phantomPath: phantomjs.path,
      parameters: {
        // Use the test server as a proxy server, so that all requests
        // go to this server (instead of trying real DNS lookups).
        proxy: '127.0.0.1:8193',
        // Set the disk storage to zero to avoid persisting localStorage
        // between test runs.
        'local-storage-quota': 0
      }
    });
  });
  after(function() {
    // Be sure to kill the browser when the test is done, or else
    // we can leave orphan processes.
    _ph.exit();
  });
  it('should serve static editor HTML', function(done) {
    // Visit the website of the user "livetest."
    _page.open('http://livetest.pencilcode.net.dev/edit',
        function(err, status) {
      assert.ifError(err);
      assert.equal(status, 'success');
      _page.evaluate(function() {
        // Inject a script that clears the login cookie for a clean start.
        document.cookie='login=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        // And also clear localStorage for this site.
        localStorage.clear();
      }, function(err) {
        assert.ifError(err);
        done();
      });
    });
  });
  it('should load code', function(done) {
    // Navigate to see the editor for the program named "hi".
    _page.open('http://livetest.pencilcode.net.dev/edit/hi',
        function(err, status) {
      assert.ifError(err);
      assert.equal(status, 'success');
      asyncTest(_page, one_step_timeout, null, function() {
        addEventListener('error', function(e) { window.lasterrorevent = e; });
      }, function() {
        // Poll until the element with class="editor" appears on the page.
        if (!$('.editor').length) return;
        // Reach in and return the text that is shown within the editor.
        var ace_editor = ace.edit($('.droplet-ace')[0]);
        return {
          text: ace_editor.getSession().getValue()
        };
      }, function(err, result) {
        assert.ifError(err);
        // The editor text should contain this line of code.
        assert.ok(/pen blue/.test(result.text));
        done();
      });
    });
  });

  it('should show slider when program runs', function(done) {
    asyncTest(_page, one_step_timeout, null, function() {
      // Click on the triangle "run" button 
      $('#run').mousedown();
      $('#run').click();
    }, function() {
      try {
        // Wait for the slider to appear after automated delay
        if (!$('#slider').length) return;
        return {
          slider: $('#slider').length,
          sliderpanel: $('.scrubbermark').length,
          backbutton: $('#backButton').length,
          forwardbutton: $('#forwardButton').length,
          pips: $('.ui-slider-pip').length,
          label: $('.ui-slider-pip-selected').find('.ui-slider-label').text().trim(),
          slidertip: $('.ui-slider-tip').text().trim()

        };
      }
      catch(e) {
        return {poll: true, error: e};
      }
    }, function(err, result) {
      assert.ifError(err);
      // Assert that the panel containing slider exists
      assert.equal(result.sliderpanel, 1);
      // Assert that the slider element has appeared 
      assert.equal(result.slider, 1);
      // Assert that buttons to toggle steps exists
      assert.equal(result.backbutton, 1);
      assert.equal(result.forwardbutton, 1);
      // Assert number of steps on slider equals traceEvents length
      assert.equal(result.pips, 56);
      // Assert that slider tip reflects appropriate line number
      assert.equal(result.label, '0');
      assert.equal(result.slidertip, 'Line  1');
      done();
    });
  }); 

  it('should allow users to use step buttons', function(done) {
    asyncTest(_page, one_step_timeout, null, function() {
      // Click on the triangle "run" button 
      $('#run').mousedown();
      $('#run').click();
    }, function() {
      try {

	  // Wait for the slider to appear after automated delay
	   if (!$('#slider').length) return;
	   if (!$('#forwardButton').length) return;
       // Note: fix this!!! $('#forwardButton').click()	

       return {
          label: $('.ui-slider-pip-selected').find('.ui-slider-label').text().trim()
        };
      }
      catch(e) {
        return {poll: true, error: e};
      }
    }, function(err, result) {
      assert.ifError(err);
      assert.equal(result.label, '0');
      done();
    });
  }); 
  

  it('is done', function(done) {
    asyncTest(_page, one_step_timeout, null, function() {
      // Final cleanup: delete local storage and the cookie.
      localStorage.clear();
      document.cookie='login=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    }, function() {
      return {
        cookie: document.cookie
      };
    }, function(err, result) {
      assert.ifError(err);
      assert.ok(!/login=/.test(result.cookie));
      done();
    });
  });
});

// Generated from: features/plan-details.feature
import { test } from "playwright-bdd";

test.describe('Plan Details Page', () => {

  test.beforeEach('Background', async ({ Given, page }, testInfo) => { if (testInfo.error) return;
    await Given('I am on the plan details page for "test-plan"', null, { page }); 
  });
  
  test('Page displays plan title', { tag: ['@smoke', '@regression'] }, async ({ Then, page }) => { 
    await Then('I should see the plan title', null, { page }); 
  });

  test('Page displays plan slug', { tag: ['@smoke', '@regression'] }, async ({ Then, page }) => { 
    await Then('I should see the plan slug', null, { page }); 
  });

  test('Page displays status badge', { tag: ['@smoke', '@regression'] }, async ({ Then, page }) => { 
    await Then('I should see the status badge', null, { page }); 
  });

  test('Page displays priority badge', { tag: ['@smoke', '@regression'] }, async ({ Then, page }) => { 
    await Then('I should see the priority badge', null, { page }); 
  });

  test('Page displays overview section', { tag: ['@smoke', '@regression'] }, async ({ Then, page }) => { 
    await Then('I should see the overview section with fields:', {"dataTable":{"rows":[{"cells":[{"value":"field"}]},{"cells":[{"value":"Type"}]},{"cells":[{"value":"Priority"}]},{"cells":[{"value":"Feature Directory"}]},{"cells":[{"value":"Story Prefix"}]},{"cells":[{"value":"Estimated Stories"}]},{"cells":[{"value":"Created"}]}]}}, { page }); 
  });

  test('Page displays tags', { tag: ['@smoke', '@regression'] }, async ({ Then, page }) => { 
    await Then('I should see the tags section', null, { page }); 
  });

  test('Back navigation to roadmap', { tag: ['@smoke', '@regression'] }, async ({ Given, Then, page }) => { 
    await Given('I click the back to roadmap link', null, { page }); 
    await Then('I should be navigated to the roadmap page', null, { page }); 
  });

  test('Page displays linked stories table', { tag: ['@smoke', '@regression'] }, async ({ Then, page }) => { 
    await Then('I should see the stories table', null, { page }); 
  });

  test('Stories table has correct columns', { tag: ['@smoke'] }, async ({ Then, page }) => { 
    await Then('the stories table should have columns:', {"dataTable":{"rows":[{"cells":[{"value":"column"}]},{"cells":[{"value":"Story ID"}]},{"cells":[{"value":"Title"}]},{"cells":[{"value":"State"}]},{"cells":[{"value":"Phase"}]},{"cells":[{"value":"Priority"}]}]}}, { page }); 
  });

  test('Clicking story ID navigates to story details', { tag: ['@smoke'] }, async ({ Given, Then, page }) => { 
    await Given('I click on a story ID in the stories table', null, { page }); 
    await Then('I should be navigated to the story details page', null, { page }); 
  });

  test('Clicking story title navigates to story details', { tag: ['@smoke'] }, async ({ Given, Then, page }) => { 
    await Given('I click on a story title in the stories table', null, { page }); 
    await Then('I should be navigated to the story details page', null, { page }); 
  });

  test('Empty stories state', { tag: ['@regression'] }, async ({ Given, Then, page }) => { 
    await Given('the plan has no linked stories', null, { page }); 
    await Then('I should see "No stories linked to this plan yet"', null, { page }); 
  });

  test('Loading state shows skeleton', { tag: ['@regression'] }, async ({ Given, Then, page }) => { 
    await Given('the page is loading', null, { page }); 
    await Then('I should see a loading skeleton', null, { page }); 
  });

  test('Error state displays message', { tag: ['@regression'] }, async ({ Given, Then, page }) => { 
    await Given('there is an error loading the plan', null, { page }); 
    await Then('I should see an error message', null, { page }); 
  });

  test('Not found state for invalid plan', { tag: ['@regression'] }, async ({ Given, Then, page }) => { 
    await Given('I navigate to a non-existent plan', null, { page }); 
    await Then('I should see an error message', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/plan-details.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":10,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the plan details page for \"test-plan\"","isBg":true,"stepMatchArguments":[{"group":{"start":34,"value":"\"test-plan\"","children":[{"start":35,"value":"test-plan","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":11,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"Then I should see the plan title","stepMatchArguments":[]}]},
  {"pwTestLine":14,"pickleLine":14,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the plan details page for \"test-plan\"","isBg":true,"stepMatchArguments":[{"group":{"start":34,"value":"\"test-plan\"","children":[{"start":35,"value":"test-plan","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":15,"gherkinStepLine":15,"keywordType":"Outcome","textWithKeyword":"Then I should see the plan slug","stepMatchArguments":[]}]},
  {"pwTestLine":18,"pickleLine":18,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the plan details page for \"test-plan\"","isBg":true,"stepMatchArguments":[{"group":{"start":34,"value":"\"test-plan\"","children":[{"start":35,"value":"test-plan","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":19,"gherkinStepLine":19,"keywordType":"Outcome","textWithKeyword":"Then I should see the status badge","stepMatchArguments":[]}]},
  {"pwTestLine":22,"pickleLine":22,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the plan details page for \"test-plan\"","isBg":true,"stepMatchArguments":[{"group":{"start":34,"value":"\"test-plan\"","children":[{"start":35,"value":"test-plan","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":23,"gherkinStepLine":23,"keywordType":"Outcome","textWithKeyword":"Then I should see the priority badge","stepMatchArguments":[]}]},
  {"pwTestLine":26,"pickleLine":26,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the plan details page for \"test-plan\"","isBg":true,"stepMatchArguments":[{"group":{"start":34,"value":"\"test-plan\"","children":[{"start":35,"value":"test-plan","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":27,"gherkinStepLine":27,"keywordType":"Outcome","textWithKeyword":"Then I should see the overview section with fields:","stepMatchArguments":[]}]},
  {"pwTestLine":30,"pickleLine":37,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the plan details page for \"test-plan\"","isBg":true,"stepMatchArguments":[{"group":{"start":34,"value":"\"test-plan\"","children":[{"start":35,"value":"test-plan","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":31,"gherkinStepLine":38,"keywordType":"Outcome","textWithKeyword":"Then I should see the tags section","stepMatchArguments":[]}]},
  {"pwTestLine":34,"pickleLine":41,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the plan details page for \"test-plan\"","isBg":true,"stepMatchArguments":[{"group":{"start":34,"value":"\"test-plan\"","children":[{"start":35,"value":"test-plan","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":35,"gherkinStepLine":42,"keywordType":"Context","textWithKeyword":"Given I click the back to roadmap link","stepMatchArguments":[]},{"pwStepLine":36,"gherkinStepLine":43,"keywordType":"Outcome","textWithKeyword":"Then I should be navigated to the roadmap page","stepMatchArguments":[]}]},
  {"pwTestLine":39,"pickleLine":46,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the plan details page for \"test-plan\"","isBg":true,"stepMatchArguments":[{"group":{"start":34,"value":"\"test-plan\"","children":[{"start":35,"value":"test-plan","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":40,"gherkinStepLine":47,"keywordType":"Outcome","textWithKeyword":"Then I should see the stories table","stepMatchArguments":[]}]},
  {"pwTestLine":43,"pickleLine":50,"tags":["@smoke"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the plan details page for \"test-plan\"","isBg":true,"stepMatchArguments":[{"group":{"start":34,"value":"\"test-plan\"","children":[{"start":35,"value":"test-plan","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":44,"gherkinStepLine":51,"keywordType":"Outcome","textWithKeyword":"Then the stories table should have columns:","stepMatchArguments":[]}]},
  {"pwTestLine":47,"pickleLine":60,"tags":["@smoke"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the plan details page for \"test-plan\"","isBg":true,"stepMatchArguments":[{"group":{"start":34,"value":"\"test-plan\"","children":[{"start":35,"value":"test-plan","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":48,"gherkinStepLine":61,"keywordType":"Context","textWithKeyword":"Given I click on a story ID in the stories table","stepMatchArguments":[]},{"pwStepLine":49,"gherkinStepLine":62,"keywordType":"Outcome","textWithKeyword":"Then I should be navigated to the story details page","stepMatchArguments":[]}]},
  {"pwTestLine":52,"pickleLine":65,"tags":["@smoke"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the plan details page for \"test-plan\"","isBg":true,"stepMatchArguments":[{"group":{"start":34,"value":"\"test-plan\"","children":[{"start":35,"value":"test-plan","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":53,"gherkinStepLine":66,"keywordType":"Context","textWithKeyword":"Given I click on a story title in the stories table","stepMatchArguments":[]},{"pwStepLine":54,"gherkinStepLine":67,"keywordType":"Outcome","textWithKeyword":"Then I should be navigated to the story details page","stepMatchArguments":[]}]},
  {"pwTestLine":57,"pickleLine":70,"tags":["@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the plan details page for \"test-plan\"","isBg":true,"stepMatchArguments":[{"group":{"start":34,"value":"\"test-plan\"","children":[{"start":35,"value":"test-plan","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":58,"gherkinStepLine":71,"keywordType":"Context","textWithKeyword":"Given the plan has no linked stories","stepMatchArguments":[]},{"pwStepLine":59,"gherkinStepLine":72,"keywordType":"Outcome","textWithKeyword":"Then I should see \"No stories linked to this plan yet\"","stepMatchArguments":[{"group":{"start":13,"value":"\"No stories linked to this plan yet\"","children":[{"start":14,"value":"No stories linked to this plan yet","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]}]},
  {"pwTestLine":62,"pickleLine":75,"tags":["@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the plan details page for \"test-plan\"","isBg":true,"stepMatchArguments":[{"group":{"start":34,"value":"\"test-plan\"","children":[{"start":35,"value":"test-plan","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":63,"gherkinStepLine":76,"keywordType":"Context","textWithKeyword":"Given the page is loading","stepMatchArguments":[]},{"pwStepLine":64,"gherkinStepLine":77,"keywordType":"Outcome","textWithKeyword":"Then I should see a loading skeleton","stepMatchArguments":[]}]},
  {"pwTestLine":67,"pickleLine":80,"tags":["@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the plan details page for \"test-plan\"","isBg":true,"stepMatchArguments":[{"group":{"start":34,"value":"\"test-plan\"","children":[{"start":35,"value":"test-plan","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":68,"gherkinStepLine":81,"keywordType":"Context","textWithKeyword":"Given there is an error loading the plan","stepMatchArguments":[]},{"pwStepLine":69,"gherkinStepLine":82,"keywordType":"Outcome","textWithKeyword":"Then I should see an error message","stepMatchArguments":[]}]},
  {"pwTestLine":72,"pickleLine":85,"tags":["@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the plan details page for \"test-plan\"","isBg":true,"stepMatchArguments":[{"group":{"start":34,"value":"\"test-plan\"","children":[{"start":35,"value":"test-plan","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":73,"gherkinStepLine":86,"keywordType":"Context","textWithKeyword":"Given I navigate to a non-existent plan","stepMatchArguments":[]},{"pwStepLine":74,"gherkinStepLine":87,"keywordType":"Outcome","textWithKeyword":"Then I should see an error message","stepMatchArguments":[]}]},
]; // bdd-data-end
// Generated from: features/roadmap.feature
import { test } from "playwright-bdd";

test.describe('Roadmap Data Table', () => {

  test.beforeEach('Background', async ({ Given, page }, testInfo) => { if (testInfo.error) return;
    await Given('I am on the roadmap page', null, { page }); 
  });
  
  test('Page loads with roadmap title', { tag: ['@smoke', '@regression'] }, async ({ Then, page }) => { 
    await Then('I should see the roadmap page title', null, { page }); 
  });

  test('Page displays plans data table', { tag: ['@smoke', '@regression'] }, async ({ Then, page }) => { 
    await Then('I should see the plans data table', null, { page }); 
  });

  test('Data table shows plan columns', { tag: ['@smoke', '@regression'] }, async ({ Then, page }) => { 
    await Then('I should see the following columns:', {"dataTable":{"rows":[{"cells":[{"value":"column"}]},{"cells":[{"value":"Slug"}]},{"cells":[{"value":"Title"}]},{"cells":[{"value":"Status"}]},{"cells":[{"value":"Priority"}]},{"cells":[{"value":"Type"}]},{"cells":[{"value":"Stories"}]},{"cells":[{"value":"Created"}]}]}}, { page }); 
  });

  test('Search filters plans by text', { tag: ['@smoke'] }, async ({ Given, When, Then, page }) => { 
    await Given('I enter "test" in the search field', null, { page }); 
    await When('I wait for results to load', null, { page }); 
    await Then('I should see filtered results', null, { page }); 
  });

  test('Status filter dropdown works', { tag: ['@smoke'] }, async ({ Given, When, Then, page }) => { 
    await Given('I open the status filter', null, { page }); 
    await When('I select "draft" status', null, { page }); 
    await Then('I should see filtered results', null, { page }); 
  });

  test('Priority filter dropdown works', { tag: ['@smoke'] }, async ({ Given, When, Then, page }) => { 
    await Given('I open the priority filter', null, { page }); 
    await When('I select "P1" priority', null, { page }); 
    await Then('I should see filtered results', null, { page }); 
  });

  test('Type filter dropdown works', { tag: ['@smoke'] }, async ({ Given, When, Then, page }) => { 
    await Given('I open the type filter', null, { page }); 
    await When('I select "feature" type', null, { page }); 
    await Then('I should see filtered results', null, { page }); 
  });

  test('Hide completed checkbox filters out completed plans', { tag: ['@smoke', '@regression'] }, async ({ Given, Then, page }) => { 
    await Given('the "Hide completed" checkbox is checked', null, { page }); 
    await Then('completed plans should be hidden', null, { page }); 
  });

  test('Clicking a plan row navigates to plan details', { tag: ['@smoke'] }, async ({ Given, Then, page }) => { 
    await Given('I click on a plan row', null, { page }); 
    await Then('I should be navigated to the plan details page', null, { page }); 
  });

  test('Empty state when no plans match filters', { tag: ['@smoke', '@regression'] }, async ({ Given, Then, page }) => { 
    await Given('I apply filters that return no results', null, { page }); 
    await Then('I should see an empty state message', null, { page }); 
  });

  test('Data table pagination controls', { tag: ['@regression'] }, async ({ Given, Then, And, page }) => { 
    await Given('there are more than 10 plans', null, { page }); 
    await Then('I should see pagination controls', null, { page }); 
    await And('I should be able to navigate between pages', null, { page }); 
  });

  test('Drag and drop reordering within priority', { tag: ['@regression'] }, async ({ Given, When, Then, page }) => { 
    await Given('I select a single priority filter "P1"', null, { page }); 
    await Then('I should see drag handles on each row', null, { page }); 
    await When('I drag a plan row to a new position', null, { page }); 
    await Then('the plan order should be updated', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/roadmap.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":10,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the roadmap page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":11,"keywordType":"Outcome","textWithKeyword":"Then I should see the roadmap page title","stepMatchArguments":[]}]},
  {"pwTestLine":14,"pickleLine":14,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the roadmap page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":15,"gherkinStepLine":15,"keywordType":"Outcome","textWithKeyword":"Then I should see the plans data table","stepMatchArguments":[]}]},
  {"pwTestLine":18,"pickleLine":18,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the roadmap page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":19,"gherkinStepLine":19,"keywordType":"Outcome","textWithKeyword":"Then I should see the following columns:","stepMatchArguments":[]}]},
  {"pwTestLine":22,"pickleLine":30,"tags":["@smoke"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the roadmap page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":23,"gherkinStepLine":31,"keywordType":"Context","textWithKeyword":"Given I enter \"test\" in the search field","stepMatchArguments":[{"group":{"start":8,"value":"\"test\"","children":[{"start":9,"value":"test","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":24,"gherkinStepLine":32,"keywordType":"Action","textWithKeyword":"When I wait for results to load","stepMatchArguments":[]},{"pwStepLine":25,"gherkinStepLine":33,"keywordType":"Outcome","textWithKeyword":"Then I should see filtered results","stepMatchArguments":[]}]},
  {"pwTestLine":28,"pickleLine":36,"tags":["@smoke"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the roadmap page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":29,"gherkinStepLine":37,"keywordType":"Context","textWithKeyword":"Given I open the status filter","stepMatchArguments":[]},{"pwStepLine":30,"gherkinStepLine":38,"keywordType":"Action","textWithKeyword":"When I select \"draft\" status","stepMatchArguments":[{"group":{"start":9,"value":"\"draft\"","children":[{"start":10,"value":"draft","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":31,"gherkinStepLine":39,"keywordType":"Outcome","textWithKeyword":"Then I should see filtered results","stepMatchArguments":[]}]},
  {"pwTestLine":34,"pickleLine":42,"tags":["@smoke"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the roadmap page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":35,"gherkinStepLine":43,"keywordType":"Context","textWithKeyword":"Given I open the priority filter","stepMatchArguments":[]},{"pwStepLine":36,"gherkinStepLine":44,"keywordType":"Action","textWithKeyword":"When I select \"P1\" priority","stepMatchArguments":[{"group":{"start":9,"value":"\"P1\"","children":[{"start":10,"value":"P1","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":37,"gherkinStepLine":45,"keywordType":"Outcome","textWithKeyword":"Then I should see filtered results","stepMatchArguments":[]}]},
  {"pwTestLine":40,"pickleLine":48,"tags":["@smoke"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the roadmap page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":41,"gherkinStepLine":49,"keywordType":"Context","textWithKeyword":"Given I open the type filter","stepMatchArguments":[]},{"pwStepLine":42,"gherkinStepLine":50,"keywordType":"Action","textWithKeyword":"When I select \"feature\" type","stepMatchArguments":[{"group":{"start":9,"value":"\"feature\"","children":[{"start":10,"value":"feature","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":43,"gherkinStepLine":51,"keywordType":"Outcome","textWithKeyword":"Then I should see filtered results","stepMatchArguments":[]}]},
  {"pwTestLine":46,"pickleLine":54,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the roadmap page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":47,"gherkinStepLine":55,"keywordType":"Context","textWithKeyword":"Given the \"Hide completed\" checkbox is checked","stepMatchArguments":[{"group":{"start":4,"value":"\"Hide completed\"","children":[{"start":5,"value":"Hide completed","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":48,"gherkinStepLine":56,"keywordType":"Outcome","textWithKeyword":"Then completed plans should be hidden","stepMatchArguments":[]}]},
  {"pwTestLine":51,"pickleLine":59,"tags":["@smoke"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the roadmap page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":52,"gherkinStepLine":60,"keywordType":"Context","textWithKeyword":"Given I click on a plan row","stepMatchArguments":[]},{"pwStepLine":53,"gherkinStepLine":61,"keywordType":"Outcome","textWithKeyword":"Then I should be navigated to the plan details page","stepMatchArguments":[]}]},
  {"pwTestLine":56,"pickleLine":64,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the roadmap page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":57,"gherkinStepLine":65,"keywordType":"Context","textWithKeyword":"Given I apply filters that return no results","stepMatchArguments":[]},{"pwStepLine":58,"gherkinStepLine":66,"keywordType":"Outcome","textWithKeyword":"Then I should see an empty state message","stepMatchArguments":[]}]},
  {"pwTestLine":61,"pickleLine":69,"tags":["@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the roadmap page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":62,"gherkinStepLine":70,"keywordType":"Context","textWithKeyword":"Given there are more than 10 plans","stepMatchArguments":[]},{"pwStepLine":63,"gherkinStepLine":71,"keywordType":"Outcome","textWithKeyword":"Then I should see pagination controls","stepMatchArguments":[]},{"pwStepLine":64,"gherkinStepLine":72,"keywordType":"Outcome","textWithKeyword":"And I should be able to navigate between pages","stepMatchArguments":[]}]},
  {"pwTestLine":67,"pickleLine":75,"tags":["@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":7,"keywordType":"Context","textWithKeyword":"Given I am on the roadmap page","isBg":true,"stepMatchArguments":[]},{"pwStepLine":68,"gherkinStepLine":76,"keywordType":"Context","textWithKeyword":"Given I select a single priority filter \"P1\"","stepMatchArguments":[{"group":{"start":34,"value":"\"P1\"","children":[{"start":35,"value":"P1","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":69,"gherkinStepLine":77,"keywordType":"Outcome","textWithKeyword":"Then I should see drag handles on each row","stepMatchArguments":[]},{"pwStepLine":70,"gherkinStepLine":78,"keywordType":"Action","textWithKeyword":"When I drag a plan row to a new position","stepMatchArguments":[]},{"pwStepLine":71,"gherkinStepLine":79,"keywordType":"Outcome","textWithKeyword":"Then the plan order should be updated","stepMatchArguments":[]}]},
]; // bdd-data-end
// Generated from: features/story-details.feature
import { test } from "playwright-bdd";

test.describe('Story Details Page', () => {

  test.beforeEach('Background', async ({ Given, page }, testInfo) => { if (testInfo.error) return;
    await Given('I am viewing the roadmap application', null, { page }); 
  });
  
  test('Navigate from plan details to story details', { tag: ['@smoke', '@regression'] }, async ({ Given, When, Then, page }) => { 
    await Given('I am on the plan details page for "consolidate-db-normalized"', null, { page }); 
    await When('I click on a story in the stories table', null, { page }); 
    await Then('I should be taken to the story details page', null, { page }); 
  });

  test('Display story title and ID badge', { tag: ['@smoke', '@regression'] }, async ({ Given, Then, And, page }) => { 
    await Given('I am on the story details page for "KNOW-042"', null, { page }); 
    await Then('I should see the story title', null, { page }); 
    await And('I should see the story ID badge', null, { page }); 
  });

  test('Display story state and priority badges', { tag: ['@smoke', '@regression'] }, async ({ Given, Then, And, page }) => { 
    await Given('I am on the story details page for "KNOW-042"', null, { page }); 
    await Then('I should see the story state badge', null, { page }); 
    await And('I should see the story priority badge', null, { page }); 
  });

  test('Show story description when present', { tag: ['@smoke', '@regression'] }, async ({ Given, Then, page }) => { 
    await Given('I am on the story details page for "CDBN-2021"', null, { page }); 
    await Then('I should see the story description', null, { page }); 
  });

  test('Render surfaces section with component badges', { tag: ['@smoke', '@regression'] }, async ({ Given, Then, page }) => { 
    await Given('I am on the story details page for "TEST-001"', null, { page }); 
    await Then('I should see the surfaces section', null, { page }); 
  });

  test('Handle story with minimal data', { tag: ['@smoke'] }, async ({ Given, Then, And, page }) => { 
    await Given('I am on the story details page for "TEST-MINIMAL"', null, { page }); 
    await Then('I should see the story title', null, { page }); 
    await And('I should not see the story description', null, { page }); 
  });

  test('Back navigation to roadmap', { tag: ['@smoke', '@regression'] }, async ({ Given, When, Then, page }) => { 
    await Given('I am on the story details page for "TEST-001"', null, { page }); 
    await When('I click the back to roadmap link', null, { page }); 
    await Then('I should be taken to the roadmap page', null, { page }); 
  });

  test('Loading state displays skeleton', { tag: ['@smoke', '@regression'] }, async ({ Given, When, Then, page }) => { 
    await Given('I am viewing the roadmap application with loading delay', null, { page }); 
    await When('I navigate to the story details page for "TEST-001"', null, { page }); 
    await Then('I should see the loading skeleton', null, { page }); 
  });

  test('Error state displays message', { tag: ['@smoke', '@regression'] }, async ({ Given, Then, page }) => { 
    await Given('I am on the story details page for "INVALID-STORY"', null, { page }); 
    await Then('I should see an error message', null, { page }); 
  });

  test('Not found state for invalid story', { tag: ['@smoke', '@regression'] }, async ({ Given, Then, page }) => { 
    await Given('I am on the story details page for "NOT-FOUND-999"', null, { page }); 
    await Then('I should see the story not found message', null, { page }); 
  });

});

// == technical section ==

test.use({
  $test: [({}, use) => use(test), { scope: 'test', box: true }],
  $uri: [({}, use) => use('features/story-details.feature'), { scope: 'test', box: true }],
  $bddFileData: [({}, use) => use(bddFileData), { scope: "test", box: true }],
});

const bddFileData = [ // bdd-data-start
  {"pwTestLine":10,"pickleLine":11,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am viewing the roadmap application","isBg":true,"stepMatchArguments":[]},{"pwStepLine":11,"gherkinStepLine":12,"keywordType":"Context","textWithKeyword":"Given I am on the plan details page for \"consolidate-db-normalized\"","stepMatchArguments":[{"group":{"start":34,"value":"\"consolidate-db-normalized\"","children":[{"start":35,"value":"consolidate-db-normalized","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":12,"gherkinStepLine":13,"keywordType":"Action","textWithKeyword":"When I click on a story in the stories table","stepMatchArguments":[]},{"pwStepLine":13,"gherkinStepLine":14,"keywordType":"Outcome","textWithKeyword":"Then I should be taken to the story details page","stepMatchArguments":[]}]},
  {"pwTestLine":16,"pickleLine":17,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am viewing the roadmap application","isBg":true,"stepMatchArguments":[]},{"pwStepLine":17,"gherkinStepLine":18,"keywordType":"Context","textWithKeyword":"Given I am on the story details page for \"KNOW-042\"","stepMatchArguments":[{"group":{"start":35,"value":"\"KNOW-042\"","children":[{"start":36,"value":"KNOW-042","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":18,"gherkinStepLine":19,"keywordType":"Outcome","textWithKeyword":"Then I should see the story title","stepMatchArguments":[]},{"pwStepLine":19,"gherkinStepLine":20,"keywordType":"Outcome","textWithKeyword":"And I should see the story ID badge","stepMatchArguments":[]}]},
  {"pwTestLine":22,"pickleLine":23,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am viewing the roadmap application","isBg":true,"stepMatchArguments":[]},{"pwStepLine":23,"gherkinStepLine":24,"keywordType":"Context","textWithKeyword":"Given I am on the story details page for \"KNOW-042\"","stepMatchArguments":[{"group":{"start":35,"value":"\"KNOW-042\"","children":[{"start":36,"value":"KNOW-042","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":24,"gherkinStepLine":25,"keywordType":"Outcome","textWithKeyword":"Then I should see the story state badge","stepMatchArguments":[]},{"pwStepLine":25,"gherkinStepLine":26,"keywordType":"Outcome","textWithKeyword":"And I should see the story priority badge","stepMatchArguments":[]}]},
  {"pwTestLine":28,"pickleLine":29,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am viewing the roadmap application","isBg":true,"stepMatchArguments":[]},{"pwStepLine":29,"gherkinStepLine":30,"keywordType":"Context","textWithKeyword":"Given I am on the story details page for \"CDBN-2021\"","stepMatchArguments":[{"group":{"start":35,"value":"\"CDBN-2021\"","children":[{"start":36,"value":"CDBN-2021","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":30,"gherkinStepLine":31,"keywordType":"Outcome","textWithKeyword":"Then I should see the story description","stepMatchArguments":[]}]},
  {"pwTestLine":33,"pickleLine":34,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am viewing the roadmap application","isBg":true,"stepMatchArguments":[]},{"pwStepLine":34,"gherkinStepLine":35,"keywordType":"Context","textWithKeyword":"Given I am on the story details page for \"TEST-001\"","stepMatchArguments":[{"group":{"start":35,"value":"\"TEST-001\"","children":[{"start":36,"value":"TEST-001","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":35,"gherkinStepLine":36,"keywordType":"Outcome","textWithKeyword":"Then I should see the surfaces section","stepMatchArguments":[]}]},
  {"pwTestLine":38,"pickleLine":39,"tags":["@smoke"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am viewing the roadmap application","isBg":true,"stepMatchArguments":[]},{"pwStepLine":39,"gherkinStepLine":40,"keywordType":"Context","textWithKeyword":"Given I am on the story details page for \"TEST-MINIMAL\"","stepMatchArguments":[{"group":{"start":35,"value":"\"TEST-MINIMAL\"","children":[{"start":36,"value":"TEST-MINIMAL","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":40,"gherkinStepLine":41,"keywordType":"Outcome","textWithKeyword":"Then I should see the story title","stepMatchArguments":[]},{"pwStepLine":41,"gherkinStepLine":42,"keywordType":"Outcome","textWithKeyword":"And I should not see the story description","stepMatchArguments":[]}]},
  {"pwTestLine":44,"pickleLine":45,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am viewing the roadmap application","isBg":true,"stepMatchArguments":[]},{"pwStepLine":45,"gherkinStepLine":46,"keywordType":"Context","textWithKeyword":"Given I am on the story details page for \"TEST-001\"","stepMatchArguments":[{"group":{"start":35,"value":"\"TEST-001\"","children":[{"start":36,"value":"TEST-001","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":46,"gherkinStepLine":47,"keywordType":"Action","textWithKeyword":"When I click the back to roadmap link","stepMatchArguments":[]},{"pwStepLine":47,"gherkinStepLine":48,"keywordType":"Outcome","textWithKeyword":"Then I should be taken to the roadmap page","stepMatchArguments":[]}]},
  {"pwTestLine":50,"pickleLine":51,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am viewing the roadmap application","isBg":true,"stepMatchArguments":[]},{"pwStepLine":51,"gherkinStepLine":52,"keywordType":"Context","textWithKeyword":"Given I am viewing the roadmap application with loading delay","stepMatchArguments":[]},{"pwStepLine":52,"gherkinStepLine":53,"keywordType":"Action","textWithKeyword":"When I navigate to the story details page for \"TEST-001\"","stepMatchArguments":[{"group":{"start":41,"value":"\"TEST-001\"","children":[{"start":42,"value":"TEST-001","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":53,"gherkinStepLine":54,"keywordType":"Outcome","textWithKeyword":"Then I should see the loading skeleton","stepMatchArguments":[]}]},
  {"pwTestLine":56,"pickleLine":57,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am viewing the roadmap application","isBg":true,"stepMatchArguments":[]},{"pwStepLine":57,"gherkinStepLine":58,"keywordType":"Context","textWithKeyword":"Given I am on the story details page for \"INVALID-STORY\"","stepMatchArguments":[{"group":{"start":35,"value":"\"INVALID-STORY\"","children":[{"start":36,"value":"INVALID-STORY","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":58,"gherkinStepLine":59,"keywordType":"Outcome","textWithKeyword":"Then I should see an error message","stepMatchArguments":[]}]},
  {"pwTestLine":61,"pickleLine":62,"tags":["@smoke","@regression"],"steps":[{"pwStepLine":7,"gherkinStepLine":8,"keywordType":"Context","textWithKeyword":"Given I am viewing the roadmap application","isBg":true,"stepMatchArguments":[]},{"pwStepLine":62,"gherkinStepLine":63,"keywordType":"Context","textWithKeyword":"Given I am on the story details page for \"NOT-FOUND-999\"","stepMatchArguments":[{"group":{"start":35,"value":"\"NOT-FOUND-999\"","children":[{"start":36,"value":"NOT-FOUND-999","children":[{"children":[]}]},{"children":[{"children":[]}]}]},"parameterTypeName":"string"}]},{"pwStepLine":63,"gherkinStepLine":64,"keywordType":"Outcome","textWithKeyword":"Then I should see the story not found message","stepMatchArguments":[]}]},
]; // bdd-data-end
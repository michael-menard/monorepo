import { test, expect } from '@playwright/test';

test.describe('MOC File Upload End-to-End Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a MOC detail page (assuming we have a test MOC)
    await page.goto('/moc/test-moc-id');
    
    // Wait for the page to load
    await page.waitForSelector('[data-testid="moc-detail-page"]', { timeout: 10000 });
  });

  test('should display file upload button in instructions tab', async ({ page }) => {
    // Navigate to instructions tab
    await page.click('text=Instructions');
    
    // Check for upload button
    const uploadButton = page.locator('button:has-text("Upload Instructions")');
    await expect(uploadButton).toBeVisible();
    
    // Verify button styling
    await expect(uploadButton).toHaveClass(/w-full/);
    await expect(uploadButton).toHaveClass(/max-w-xs/);
    await expect(uploadButton).toHaveClass(/rounded-lg/);
    await expect(uploadButton).toHaveClass(/shadow-lg/);
  });

  test('should open file upload dialog when button is clicked', async ({ page }) => {
    // Navigate to instructions tab
    await page.click('text=Instructions');
    
    // Click upload button
    await page.click('button:has-text("Upload Instructions")');
    
    // Check for dialog
    await expect(page.locator('text=Upload Instructions File')).toBeVisible();
    
    // Check for form fields
    await expect(page.locator('label:has-text("Title")')).toBeVisible();
    await expect(page.locator('label:has-text("Description")')).toBeVisible();
    await expect(page.locator('label:has-text("File")')).toBeVisible();
    await expect(page.locator('label:has-text("Thumbnail Image")')).toBeVisible();
  });

  test('should validate required fields in upload form', async ({ page }) => {
    // Navigate to instructions tab and open upload dialog
    await page.click('text=Instructions');
    await page.click('button:has-text("Upload Instructions")');
    
    // Try to submit without filling required fields
    await page.click('button:has-text("Upload File")');
    
    // Should show validation error for title
    await expect(page.locator('text=Title is required')).toBeVisible();
  });

  test('should accept PDF file upload', async ({ page }) => {
    // Navigate to instructions tab and open upload dialog
    await page.click('text=Instructions');
    await page.click('button:has-text("Upload Instructions")');
    
    // Fill form
    await page.fill('input[placeholder="Enter file title"]', 'Test PDF Instructions');
    await page.fill('textarea[placeholder="Enter file description"]', 'A test PDF file for instructions');
    
    // Upload PDF file
    const fileInput = page.locator('input[accept=".pdf,.io,application/pdf"]');
    await fileInput.setInputFiles('tests/fixtures/test-instructions.pdf');
    
    // Submit form
    await page.click('button:has-text("Upload File")');
    
    // Wait for upload to complete
    await page.waitForSelector('text=File uploaded successfully', { timeout: 10000 });
    
    // Verify file appears in the list
    await expect(page.locator('text=Test PDF Instructions')).toBeVisible();
    await expect(page.locator('text=A test PDF file for instructions')).toBeVisible();
  });

  test('should accept .io file upload', async ({ page }) => {
    // Navigate to instructions tab and open upload dialog
    await page.click('text=Instructions');
    await page.click('button:has-text("Upload Instructions")');
    
    // Fill form
    await page.fill('input[placeholder="Enter file title"]', 'Test Stud.io Model');
    await page.fill('textarea[placeholder="Enter file description"]', 'A test Stud.io model file');
    
    // Upload .io file
    const fileInput = page.locator('input[accept=".pdf,.io,application/pdf"]');
    await fileInput.setInputFiles('tests/fixtures/test-model.io');
    
    // Submit form
    await page.click('button:has-text("Upload File")');
    
    // Wait for upload to complete
    await page.waitForSelector('text=File uploaded successfully', { timeout: 10000 });
    
    // Verify file appears in the list
    await expect(page.locator('text=Test Stud.io Model')).toBeVisible();
    await expect(page.locator('text=A test Stud.io model file')).toBeVisible();
  });

  test('should reject invalid file types', async ({ page }) => {
    // Navigate to instructions tab and open upload dialog
    await page.click('text=Instructions');
    await page.click('button:has-text("Upload Instructions")');
    
    // Fill form
    await page.fill('input[placeholder="Enter file title"]', 'Invalid File');
    
    // Try to upload invalid file
    const fileInput = page.locator('input[accept=".pdf,.io,application/pdf"]');
    await fileInput.setInputFiles('tests/fixtures/invalid-file.txt');
    
    // Submit form
    await page.click('button:has-text("Upload File")');
    
    // Should show error message
    await expect(page.locator('text=Invalid file type')).toBeVisible();
  });

  test('should reject oversized files', async ({ page }) => {
    // Navigate to instructions tab and open upload dialog
    await page.click('text=Instructions');
    await page.click('button:has-text("Upload Instructions")');
    
    // Fill form
    await page.fill('input[placeholder="Enter file title"]', 'Large File');
    
    // Try to upload large file
    const fileInput = page.locator('input[accept=".pdf,.io,application/pdf"]');
    await fileInput.setInputFiles('tests/fixtures/large-file.pdf');
    
    // Submit form
    await page.click('button:has-text("Upload File")');
    
    // Should show error message
    await expect(page.locator('text=File size must be less than 50MB')).toBeVisible();
  });

  test('should upload file with thumbnail image', async ({ page }) => {
    // Navigate to instructions tab and open upload dialog
    await page.click('text=Instructions');
    await page.click('button:has-text("Upload Instructions")');
    
    // Fill form
    await page.fill('input[placeholder="Enter file title"]', 'File with Thumbnail');
    await page.fill('textarea[placeholder="Enter file description"]', 'A file with a thumbnail image');
    
    // Upload main file
    const fileInput = page.locator('input[accept=".pdf,.io,application/pdf"]');
    await fileInput.setInputFiles('tests/fixtures/test-instructions.pdf');
    
    // Upload thumbnail
    const thumbnailInput = page.locator('input[accept="image/*"]');
    await thumbnailInput.setInputFiles('tests/fixtures/thumbnail.jpg');
    
    // Submit form
    await page.click('button:has-text("Upload File")');
    
    // Wait for upload to complete
    await page.waitForSelector('text=File uploaded successfully', { timeout: 10000 });
    
    // Verify file appears with thumbnail
    await expect(page.locator('text=File with Thumbnail')).toBeVisible();
    await expect(page.locator('img[alt="File with Thumbnail"]')).toBeVisible();
  });

  test('should download uploaded files', async ({ page }) => {
    // Navigate to instructions tab
    await page.click('text=Instructions');
    
    // Wait for files to load
    await page.waitForSelector('text=Test PDF Instructions', { timeout: 10000 });
    
    // Click download button for first file
    const downloadButton = page.locator('button:has-text("Download")').first();
    
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');
    await downloadButton.click();
    
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toBe('instructions.pdf');
  });

  test('should delete uploaded files', async ({ page }) => {
    // Navigate to instructions tab
    await page.click('text=Instructions');
    
    // Wait for files to load
    await page.waitForSelector('text=Test PDF Instructions', { timeout: 10000 });
    
    // Click delete button for first file
    const deleteButton = page.locator('button:has-text("Delete")').first();
    await deleteButton.click();
    
    // Confirm deletion (if confirmation dialog appears)
    const confirmButton = page.locator('button:has-text("Confirm")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
    
    // Wait for file to be removed
    await page.waitForSelector('text=Test PDF Instructions', { state: 'hidden', timeout: 10000 });
  });

  test('should display file information correctly', async ({ page }) => {
    // Navigate to instructions tab
    await page.click('text=Instructions');
    
    // Wait for files to load
    await page.waitForSelector('text=Test PDF Instructions', { timeout: 10000 });
    
    // Check file information
    await expect(page.locator('text=PDF')).toBeVisible();
    await expect(page.locator('text=1 MB')).toBeVisible();
    await expect(page.locator('text=5 downloads')).toBeVisible();
    
    // Check file with no thumbnail shows default icon
    await expect(page.locator('text=Test Stud.io File')).toBeVisible();
    await expect(page.locator('svg[data-testid="file-text-icon"]')).toBeVisible();
  });

  test('should handle multiple file uploads', async ({ page }) => {
    // Navigate to instructions tab and open upload dialog
    await page.click('text=Instructions');
    await page.click('button:has-text("Upload Instructions")');
    
    // Upload first file
    await page.fill('input[placeholder="Enter file title"]', 'First File');
    const fileInput = page.locator('input[accept=".pdf,.io,application/pdf"]');
    await fileInput.setInputFiles('tests/fixtures/test-instructions.pdf');
    await page.click('button:has-text("Upload File")');
    
    // Wait for upload to complete
    await page.waitForSelector('text=File uploaded successfully', { timeout: 10000 });
    
    // Close dialog and open again for second file
    await page.click('button:has-text("Cancel")');
    await page.click('button:has-text("Upload Instructions")');
    
    // Upload second file
    await page.fill('input[placeholder="Enter file title"]', 'Second File');
    await fileInput.setInputFiles('tests/fixtures/test-model.io');
    await page.click('button:has-text("Upload File")');
    
    // Wait for upload to complete
    await page.waitForSelector('text=File uploaded successfully', { timeout: 10000 });
    
    // Verify both files are displayed
    await expect(page.locator('text=First File')).toBeVisible();
    await expect(page.locator('text=Second File')).toBeVisible();
  });

  test('should provide keyboard navigation for file upload', async ({ page }) => {
    // Navigate to instructions tab
    await page.click('text=Instructions');
    
    // Tab to upload button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Open dialog with Enter key
    await page.keyboard.press('Enter');
    
    // Check dialog is open
    await expect(page.locator('text=Upload Instructions File')).toBeVisible();
    
    // Tab through form fields
    await page.keyboard.press('Tab');
    await expect(page.locator('input[placeholder="Enter file title"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('textarea[placeholder="Enter file description"]')).toBeFocused();
    
    // Close dialog with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Upload Instructions File')).not.toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Navigate to instructions tab and open upload dialog
    await page.click('text=Instructions');
    await page.click('button:has-text("Upload Instructions")');
    
    // Fill form
    await page.fill('input[placeholder="Enter file title"]', 'Network Test File');
    const fileInput = page.locator('input[accept=".pdf,.io,application/pdf"]');
    await fileInput.setInputFiles('tests/fixtures/test-instructions.pdf');
    
    // Simulate network error by going offline
    await page.context().setOffline(true);
    
    // Submit form
    await page.click('button:has-text("Upload File")');
    
    // Should show error message
    await expect(page.locator('text=Failed to upload file')).toBeVisible();
    
    // Dialog should remain open for retry
    await expect(page.locator('text=Upload Instructions File')).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
  });

  test('should maintain state during page refresh', async ({ page }) => {
    // Navigate to instructions tab
    await page.click('text=Instructions');
    
    // Wait for files to load
    await page.waitForSelector('text=Test PDF Instructions', { timeout: 10000 });
    
    // Refresh page
    await page.reload();
    
    // Navigate back to instructions tab
    await page.click('text=Instructions');
    
    // Files should still be displayed
    await expect(page.locator('text=Test PDF Instructions')).toBeVisible();
    await expect(page.locator('text=Test Stud.io File')).toBeVisible();
  });
}); 
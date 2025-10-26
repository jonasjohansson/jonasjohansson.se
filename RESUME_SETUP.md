# Google Sheets Resume Integration Setup

This guide will help you integrate your published Google Sheets resume with your website.

## Prerequisites

1. A Google account
2. Your Google Sheet published as HTML: https://docs.google.com/spreadsheets/u/1/d/e/2PACX-1vSdECybrvqdFRdXdglDL9pYuygE9NiSIRDz7A-GzvuHMOh0-fRfZWww_Wj4SSNk_vtsreDhrGrstGkM/pubhtml

## Step 1: Publish Your Google Sheet

1. Open your Google Sheet
2. Go to File > Share > Publish to web
3. Choose "Web page" format
4. Click "Publish"
5. Copy the published URL (it should end with `/pubhtml`)

## Step 2: Configure Your Sheet

Make sure your Google Sheet has the following structure:

| Column | Purpose           | Example                            |
| ------ | ----------------- | ---------------------------------- |
| A-J    | Your data columns | Any content                        |
| **K**  | **Filter column** | `true` or `false`                  |
| L+     | Additional data   | Category, Title, Description, Date |

The system will only show rows where column K is `true`.

## Step 3: Update Configuration (Optional)

The system is already configured to use your published sheet! If you need to change the URL or column mapping, edit `src/js/config/resume.js`:

```javascript
COLUMNS: {
  FILTER: "K",                    // Column K for true/false
  CATEGORY: "Category",          // Your category column
  TITLE: "Title",                // Your title column
  DESCRIPTION: "Description",     // Your description column
  DATE: "Date"                   // Your date column
}
```

## Step 4: Test the Integration

1. Make sure your development server is running
2. Navigate to the about section of your site
3. The resume should load automatically from your published Google Sheet
4. Check the browser console for any errors

## Features

- **Automatic loading**: Resume data loads when the about section is viewed
- **No API key needed**: Uses published HTML version
- **Filtering**: Only shows entries where column K is `true`
- **Grouping**: Entries are grouped by category
- **Responsive design**: Works on all devices
- **Error handling**: Shows helpful error messages if something goes wrong

## Troubleshooting

### "Failed to load resume data" error

- Check that your Google Sheet is published as HTML
- Verify the published URL is correct
- Make sure the sheet is publicly accessible

### No data showing

- Check that column K has `true` values for entries you want to show
- Verify your column headers match the configuration
- Check the browser console for specific error messages

## Security Notes

- The published sheet data will be visible to anyone who can view your website
- No API keys or authentication needed
- Make sure you only publish data you want to be public

## Customization

You can customize the appearance by editing `src/css/modules/resume.css`:

- Colors and styling
- Layout and spacing
- Responsive breakpoints
- Animation effects

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your Google Sheets API setup
3. Test with a simple sheet first
4. Check that your sheet structure matches the expected format

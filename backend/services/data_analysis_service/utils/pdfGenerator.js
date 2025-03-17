const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

/**
 * Generate a health report PDF for a user
 * @param {Object} userData - User data including profile and health information
 * @param {Object} consumptionData - Tea consumption data
 * @param {Object} chartPaths - Paths to chart images
 * @param {string} filename - Output filename (without extension)
 * @returns {string} - Path to the generated PDF file
 */
async function generateHealthReport(userData, consumptionData, chartPaths, filename) {
  return new Promise((resolve, reject) => {
    try {
      const pdfStoragePath = process.env.PDF_STORAGE_PATH || './storage/pdfs';
      const chartStoragePath = process.env.CHART_STORAGE_PATH || './storage/charts';
      const uniqueFilename = `${filename}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
      const filePath = path.join(pdfStoragePath, uniqueFilename);
      
      // Create a new PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 60, right: 60 },
        info: {
          Title: `Health Report for ${userData.name}`,
          Author: '中医奶茶养生 App',
          Subject: 'Health and Consumption Analysis',
          Keywords: 'TCM, health, analysis, tea',
        },
      });
      
      // Pipe the PDF to a file
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Add report header
      doc.fontSize(24)
         .fillColor('#8B6F4E')
         .text('中医奶茶养生', { align: 'center' })
         .fontSize(18)
         .fillColor('#333333')
         .text('Health Analysis Report', { align: 'center' })
         .moveDown(0.5);
      
      // Add report date
      doc.fontSize(12)
         .fillColor('#666666')
         .text(`Generated on: ${moment().format('MMMM D, YYYY')}`, { align: 'center' })
         .moveDown(1.5);
      
      // Add user information section
      doc.fontSize(16)
         .fillColor('#8B6F4E')
         .text('User Information', { underline: true })
         .moveDown(0.5);
      
      doc.fontSize(12)
         .fillColor('#333333')
         .text(`Name: ${userData.name}`)
         .text(`Age: ${userData.age}`)
         .text(`Gender: ${userData.gender}`)
         .text(`TCM Constitution: ${userData.constitution}`)
         .moveDown(1.5);
      
      // Add health summary section
      doc.fontSize(16)
         .fillColor('#8B6F4E')
         .text('Health Summary', { underline: true })
         .moveDown(0.5);
      
      doc.fontSize(12)
         .fillColor('#333333')
         .text(userData.healthSummary || 'No health summary available.')
         .moveDown(1.5);
      
      // Add consumption analysis section
      doc.fontSize(16)
         .fillColor('#8B6F4E')
         .text('Consumption Analysis', { underline: true })
         .moveDown(0.5);
      
      doc.fontSize(12)
         .fillColor('#333333')
         .text(`Total Teas Consumed: ${consumptionData.totalConsumed}`)
         .text(`Favorite Category: ${consumptionData.favoriteCategory}`)
         .text(`Most Common Consumption Time: ${consumptionData.commonTime}`)
         .moveDown(1);
      
      // Add charts if available
      if (chartPaths && chartPaths.length > 0) {
        chartPaths.forEach((chartPath, index) => {
          if (doc.y > 650) {
            doc.addPage();
          }
          
          doc.fontSize(14)
             .fillColor('#8B6F4E')
             .text(chartPath.title, { underline: true })
             .moveDown(0.5);
          
          const imagePath = path.join(chartStoragePath, chartPath.filename);
          if (fs.existsSync(imagePath)) {
            doc.image(imagePath, {
              fit: [480, 300],
              align: 'center',
            });
          } else {
            doc.fontSize(12)
               .fillColor('red')
               .text(`Chart image not found: ${chartPath.filename}`, { align: 'center' });
          }
          
          doc.moveDown(1);
        });
      }
      
      // Add recommendations section
      if (doc.y > 650) {
        doc.addPage();
      }
      
      doc.fontSize(16)
         .fillColor('#8B6F4E')
         .text('Recommendations', { underline: true })
         .moveDown(0.5);
      
      doc.fontSize(12)
         .fillColor('#333333');
      
      if (userData.recommendations && userData.recommendations.length > 0) {
        userData.recommendations.forEach((recommendation, index) => {
          doc.text(`${index + 1}. ${recommendation}`);
        });
      } else {
        doc.text('No specific recommendations available.');
      }
      
      doc.moveDown(1.5);
      
      // Add footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        // Save the current position
        const originalY = doc.y;
        
        // Set the position to the bottom of the page
        doc.fontSize(10)
           .fillColor('#888888')
           .text(
             '中医奶茶养生 App - Health Analysis Report',
             doc.page.margins.left,
             doc.page.height - doc.page.margins.bottom - 20,
             { align: 'center', width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
           )
           .text(
             `Page ${i + 1} of ${pageCount}`,
             doc.page.margins.left,
             doc.page.height - doc.page.margins.bottom - 10,
             { align: 'center', width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
           );
        
        // Restore the position
        doc.y = originalY;
      }
      
      // Finalize the PDF
      doc.end();
      
      // When the stream is finished, resolve the promise with the file path
      stream.on('finish', () => {
        resolve(uniqueFilename);
      });
      
      // Handle error
      stream.on('error', (err) => {
        reject(err);
      });
      
    } catch (err) {
      console.error('Error generating PDF report:', err);
      reject(err);
    }
  });
}

/**
 * Generate a consumption trends report PDF
 * @param {Object} userData - User data
 * @param {Array} trendsData - Consumption trends data
 * @param {Object} chartPaths - Paths to chart images
 * @param {string} filename - Output filename (without extension)
 * @returns {string} - Path to the generated PDF file
 */
async function generateTrendsReport(userData, trendsData, chartPaths, filename) {
  return new Promise((resolve, reject) => {
    try {
      const pdfStoragePath = process.env.PDF_STORAGE_PATH || './storage/pdfs';
      const chartStoragePath = process.env.CHART_STORAGE_PATH || './storage/charts';
      const uniqueFilename = `${filename}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
      const filePath = path.join(pdfStoragePath, uniqueFilename);
      
      // Create a new PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 60, right: 60 },
        info: {
          Title: `Consumption Trends Report for ${userData.name}`,
          Author: '中医奶茶养生 App',
          Subject: 'Consumption Trends Analysis',
          Keywords: 'TCM, consumption, trends, tea',
        },
      });
      
      // Pipe the PDF to a file
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Add report header
      doc.fontSize(24)
         .fillColor('#8B6F4E')
         .text('中医奶茶养生', { align: 'center' })
         .fontSize(18)
         .fillColor('#333333')
         .text('Consumption Trends Report', { align: 'center' })
         .moveDown(0.5);
      
      // Add report date
      doc.fontSize(12)
         .fillColor('#666666')
         .text(`Generated on: ${moment().format('MMMM D, YYYY')}`, { align: 'center' })
         .moveDown(1.5);
      
      // Add user information section
      doc.fontSize(16)
         .fillColor('#8B6F4E')
         .text('User Information', { underline: true })
         .moveDown(0.5);
      
      doc.fontSize(12)
         .fillColor('#333333')
         .text(`Name: ${userData.name}`)
         .moveDown(1.5);
      
      // Add trends overview section
      doc.fontSize(16)
         .fillColor('#8B6F4E')
         .text('Trends Overview', { underline: true })
         .moveDown(0.5);
      
      doc.fontSize(12)
         .fillColor('#333333')
         .text(trendsData.overview || 'No trends overview available.')
         .moveDown(1.5);
      
      // Add charts if available
      if (chartPaths && chartPaths.length > 0) {
        chartPaths.forEach((chartPath, index) => {
          if (doc.y > 650) {
            doc.addPage();
          }
          
          doc.fontSize(14)
             .fillColor('#8B6F4E')
             .text(chartPath.title, { underline: true })
             .moveDown(0.5);
          
          const imagePath = path.join(chartStoragePath, chartPath.filename);
          if (fs.existsSync(imagePath)) {
            doc.image(imagePath, {
              fit: [480, 300],
              align: 'center',
            });
          } else {
            doc.fontSize(12)
               .fillColor('red')
               .text(`Chart image not found: ${chartPath.filename}`, { align: 'center' });
          }
          
          doc.moveDown(1);
        });
      }
      
      // Add detailed analysis section
      if (doc.y > 650) {
        doc.addPage();
      }
      
      doc.fontSize(16)
         .fillColor('#8B6F4E')
         .text('Detailed Analysis', { underline: true })
         .moveDown(0.5);
      
      if (trendsData.details && trendsData.details.length > 0) {
        trendsData.details.forEach((detail, index) => {
          doc.fontSize(14)
             .fillColor('#00B4D8')
             .text(detail.title)
             .moveDown(0.3);
          
          doc.fontSize(12)
             .fillColor('#333333')
             .text(detail.content)
             .moveDown(1);
        });
      } else {
        doc.fontSize(12)
           .fillColor('#333333')
           .text('No detailed analysis available.')
           .moveDown(1);
      }
      
      // Add insights and recommendations section
      if (doc.y > 650) {
        doc.addPage();
      }
      
      doc.fontSize(16)
         .fillColor('#8B6F4E')
         .text('Insights & Recommendations', { underline: true })
         .moveDown(0.5);
      
      doc.fontSize(12)
         .fillColor('#333333');
      
      if (trendsData.insights && trendsData.insights.length > 0) {
        trendsData.insights.forEach((insight, index) => {
          doc.text(`${index + 1}. ${insight}`);
          doc.moveDown(0.5);
        });
      } else {
        doc.text('No specific insights or recommendations available.');
      }
      
      doc.moveDown(1.5);
      
      // Add footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        // Save the current position
        const originalY = doc.y;
        
        // Set the position to the bottom of the page
        doc.fontSize(10)
           .fillColor('#888888')
           .text(
             '中医奶茶养生 App - Consumption Trends Report',
             doc.page.margins.left,
             doc.page.height - doc.page.margins.bottom - 20,
             { align: 'center', width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
           )
           .text(
             `Page ${i + 1} of ${pageCount}`,
             doc.page.margins.left,
             doc.page.height - doc.page.margins.bottom - 10,
             { align: 'center', width: doc.page.width - doc.page.margins.left - doc.page.margins.right }
           );
        
        // Restore the position
        doc.y = originalY;
      }
      
      // Finalize the PDF
      doc.end();
      
      // When the stream is finished, resolve the promise with the file path
      stream.on('finish', () => {
        resolve(uniqueFilename);
      });
      
      // Handle error
      stream.on('error', (err) => {
        reject(err);
      });
      
    } catch (err) {
      console.error('Error generating trends report:', err);
      reject(err);
    }
  });
}

module.exports = {
  generateHealthReport,
  generateTrendsReport,
}; 
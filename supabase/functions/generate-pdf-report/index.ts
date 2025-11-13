import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkPeriod {
  id: string;
  date: string;
  teamSize: number;
  daysWorked: number;
  hoursPerDay: number;
  workType: string;
  location: string;
  totalHours: number;
  periodCost: number;
  images: string[];
}

interface Project {
  id: string;
  name: string;
  hourlySalary: number;
  targetBudget: number;
  workPeriods: WorkPeriod[];
}

async function fetchImageAsBytes(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { project } = await req.json() as { project: Project };

    if (!project) {
      return new Response(
        JSON.stringify({ error: 'Project data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating PDF for project:', project.name);

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    // Add first page
    let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    let yPosition = height - 50;

    // Title
    page.drawText('Project Budget Report', {
      x: 50,
      y: yPosition,
      size: 24,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;

    // Project Details
    page.drawText(`Project: ${project.name}`, {
      x: 50,
      y: yPosition,
      size: 14,
      font: timesRomanBold,
    });
    yPosition -= 25;

    page.drawText(`Hourly Rate: $${project.hourlySalary.toFixed(2)}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
    });
    yPosition -= 20;

    page.drawText(`Target Budget: $${project.targetBudget.toFixed(2)}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
    });
    yPosition -= 30;

    // Calculate summary
    const totalHours = project.workPeriods.reduce((sum, p) => sum + p.totalHours, 0);
    const totalCost = project.workPeriods.reduce((sum, p) => sum + p.periodCost, 0);
    const remaining = project.targetBudget - totalCost;
    const progress = (totalCost / project.targetBudget) * 100;

    // Summary Section
    page.drawText('Summary', {
      x: 50,
      y: yPosition,
      size: 16,
      font: timesRomanBold,
    });
    yPosition -= 25;

    page.drawText(`Total Hours: ${totalHours.toFixed(2)}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
    });
    yPosition -= 20;

    page.drawText(`Total Cost: $${totalCost.toFixed(2)}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
    });
    yPosition -= 20;

    page.drawText(`Remaining Budget: $${remaining.toFixed(2)}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
      color: remaining < 0 ? rgb(0.8, 0, 0) : rgb(0, 0.5, 0),
    });
    yPosition -= 20;

    page.drawText(`Progress: ${progress.toFixed(1)}%`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
    });
    yPosition -= 40;

    // Work Periods Section
    page.drawText('Work Periods', {
      x: 50,
      y: yPosition,
      size: 16,
      font: timesRomanBold,
    });
    yPosition -= 30;

    for (let i = 0; i < project.workPeriods.length; i++) {
      const period = project.workPeriods[i];

      // Check if we need a new page
      if (yPosition < 150) {
        page = pdfDoc.addPage([595.28, 841.89]);
        yPosition = height - 50;
      }

      // Period header
      page.drawText(`Period ${i + 1} - ${new Date(period.date).toLocaleDateString()}`, {
        x: 50,
        y: yPosition,
        size: 13,
        font: timesRomanBold,
      });
      yPosition -= 20;

      // Period details
      const details = [
        `Work Type: ${period.workType}`,
        `Location: ${period.location}`,
        `Team Size: ${period.teamSize}`,
        `Days Worked: ${period.daysWorked}`,
        `Hours/Day: ${period.hoursPerDay}`,
        `Total Hours: ${period.totalHours}`,
        `Cost: $${period.periodCost.toFixed(2)}`,
      ];

      for (const detail of details) {
        page.drawText(detail, {
          x: 70,
          y: yPosition,
          size: 10,
          font: timesRomanFont,
        });
        yPosition -= 15;
      }

      // Add images if they exist
      if (period.images && period.images.length > 0) {
        page.drawText(`Images: ${period.images.length} attached`, {
          x: 70,
          y: yPosition,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0.8),
        });
        yPosition -= 20;

        // Try to embed first image as preview
        if (period.images[0]) {
          const imageBytes = await fetchImageAsBytes(period.images[0]);
          if (imageBytes) {
            try {
              let embeddedImage;
              if (period.images[0].toLowerCase().includes('.png')) {
                embeddedImage = await pdfDoc.embedPng(imageBytes);
              } else {
                embeddedImage = await pdfDoc.embedJpg(imageBytes);
              }

              const imgDims = embeddedImage.scale(0.15);
              
              // Check if we need a new page for the image
              if (yPosition - imgDims.height < 50) {
                page = pdfDoc.addPage([595.28, 841.89]);
                yPosition = height - 50;
              }

              page.drawImage(embeddedImage, {
                x: 70,
                y: yPosition - imgDims.height,
                width: imgDims.width,
                height: imgDims.height,
              });
              yPosition -= imgDims.height + 10;
            } catch (error) {
              console.error('Error embedding image:', error);
            }
          }
        }
      }

      yPosition -= 10;
      
      // Draw separator line
      page.drawLine({
        start: { x: 50, y: yPosition },
        end: { x: width - 50, y: yPosition },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
      });
      yPosition -= 20;
    }

    // Footer on last page
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    lastPage.drawText(`Generated on ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: 30,
      size: 8,
      font: timesRomanFont,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();

    console.log('PDF generated successfully, size:', pdfBytes.length);

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_report.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

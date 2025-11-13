import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

function generateHTMLReport(project: Project): string {
  const totalHours = project.workPeriods.reduce((sum, p) => sum + p.totalHours, 0);
  const totalCost = project.workPeriods.reduce((sum, p) => sum + p.periodCost, 0);
  const remaining = project.targetBudget - totalCost;
  const progress = (totalCost / project.targetBudget) * 100;

  const periodsHTML = project.workPeriods.map((period, index) => `
    <div class="period">
      <h3>Period ${index + 1} - ${new Date(period.date).toLocaleDateString()}</h3>
      <div class="period-details">
        <p><strong>Work Type:</strong> ${period.workType}</p>
        <p><strong>Location:</strong> ${period.location}</p>
        <p><strong>Team Size:</strong> ${period.teamSize}</p>
        <p><strong>Days Worked:</strong> ${period.daysWorked}</p>
        <p><strong>Hours/Day:</strong> ${period.hoursPerDay}</p>
        <p><strong>Total Hours:</strong> ${period.totalHours}</p>
        <p><strong>Cost:</strong> $${period.periodCost.toFixed(2)}</p>
      </div>
      ${period.images && period.images.length > 0 ? `
        <div class="images">
          <p><strong>Images:</strong> ${period.images.length} attached</p>
          ${period.images.slice(0, 1).map(img => `<img src="${img}" alt="Period image" />`).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${project.name} - Budget Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        h1 {
          color: #333;
          margin-bottom: 30px;
          border-bottom: 3px solid #ff6b35;
          padding-bottom: 10px;
        }
        .project-info {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .project-info h2 {
          color: #ff6b35;
          margin-bottom: 15px;
        }
        .project-info p {
          margin: 8px 0;
          font-size: 14px;
        }
        .summary {
          background: #fff3e0;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
          border-left: 4px solid #ff6b35;
        }
        .summary h2 {
          color: #ff6b35;
          margin-bottom: 15px;
        }
        .summary p {
          margin: 10px 0;
          font-size: 16px;
        }
        .remaining {
          color: ${remaining < 0 ? '#d32f2f' : '#2e7d32'};
          font-weight: bold;
        }
        .periods {
          margin-top: 30px;
        }
        .periods h2 {
          color: #ff6b35;
          margin-bottom: 20px;
        }
        .period {
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .period h3 {
          color: #333;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
        .period-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .period-details p {
          font-size: 14px;
          color: #555;
        }
        .images {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #eee;
        }
        .images img {
          max-width: 200px;
          height: auto;
          border-radius: 4px;
          margin-top: 10px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #888;
          font-size: 12px;
        }
        @media print {
          body {
            padding: 20px;
          }
          .period {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <h1>Project Budget Report</h1>
      
      <div class="project-info">
        <h2>Project Details</h2>
        <p><strong>Project Name:</strong> ${project.name}</p>
        <p><strong>Hourly Rate:</strong> $${project.hourlySalary.toFixed(2)}</p>
        <p><strong>Target Budget:</strong> $${project.targetBudget.toFixed(2)}</p>
      </div>

      <div class="summary">
        <h2>Summary</h2>
        <p><strong>Total Hours:</strong> ${totalHours.toFixed(2)}</p>
        <p><strong>Total Cost:</strong> $${totalCost.toFixed(2)}</p>
        <p class="remaining"><strong>Remaining Budget:</strong> $${remaining.toFixed(2)}</p>
        <p><strong>Progress:</strong> ${progress.toFixed(1)}%</p>
      </div>

      <div class="periods">
        <h2>Work Periods</h2>
        ${periodsHTML}
      </div>

      <div class="footer">
        Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
      </div>
    </body>
    </html>
  `;
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

    console.log('Generating HTML report for project ID:', project.id.substring(0, 8));

    const htmlContent = generateHTMLReport(project);

    return new Response(htmlContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_report.html"`,
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

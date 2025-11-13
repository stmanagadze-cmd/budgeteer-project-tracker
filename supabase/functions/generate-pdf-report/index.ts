import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HTML sanitization function
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

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

  // Sanitize all user-provided strings to prevent XSS
  const safeName = escapeHtml(project.name);
  
  const periodsHTML = project.workPeriods.map((period, index) => `
    <div class="period">
      <h3>Period ${index + 1} - ${new Date(period.date).toLocaleDateString()}</h3>
      <div class="period-details">
        <p><strong>Work Type:</strong> ${escapeHtml(period.workType)}</p>
        <p><strong>Location:</strong> ${escapeHtml(period.location)}</p>
        <p><strong>Team Size:</strong> ${period.teamSize}</p>
        <p><strong>Days Worked:</strong> ${period.daysWorked}</p>
        <p><strong>Hours/Day:</strong> ${period.hoursPerDay}</p>
        <p><strong>Total Hours:</strong> ${period.totalHours}</p>
        <p><strong>Cost:</strong> $${period.periodCost.toFixed(2)}</p>
      </div>
      ${period.images && period.images.length > 0 ? `
        <div class="images">
          <p><strong>Images:</strong> ${period.images.length} attached</p>
          ${period.images.slice(0, 1).map(img => `<img src="${escapeHtml(img)}" alt="Period image" />`).join('')}
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
        <p><strong>Project Name:</strong> ${safeName}</p>
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
    // Check for authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with auth header
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const { project } = await req.json() as { project: Project };

    if (!project || !project.id) {
      return new Response(
        JSON.stringify({ error: 'Project data with valid ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns the project
    const { data: projectData, error: projectError } = await supabaseClient
      .from('projects')
      .select('id, user_id')
      .eq('id', project.id)
      .single();

    if (projectError || !projectData) {
      console.error('Project not found:', projectError?.message);
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (projectData.user_id !== user.id) {
      console.error('User does not own project:', { projectId: project.id.substring(0, 8), userId: user.id.substring(0, 8) });
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not have access to this project' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate numeric values are within reasonable ranges
    if (project.hourlySalary < 0 || project.hourlySalary > 10000) {
      return new Response(
        JSON.stringify({ error: 'Invalid hourly salary value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (project.targetBudget < 0 || project.targetBudget > 10000000) {
      return new Response(
        JSON.stringify({ error: 'Invalid target budget value' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate work periods
    for (const period of project.workPeriods) {
      if (period.teamSize < 1 || period.teamSize > 1000) {
        return new Response(
          JSON.stringify({ error: 'Invalid team size in work period' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (period.hoursPerDay < 1 || period.hoursPerDay > 24) {
        return new Response(
          JSON.stringify({ error: 'Invalid hours per day in work period' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Generating HTML report for project ID:', project.id.substring(0, 8), 'for user:', user.id.substring(0, 8));

    const htmlContent = generateHTMLReport(project);
    
    // Sanitize filename
    const safeFilename = project.name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').substring(0, 100);

    return new Response(htmlContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${safeFilename}_report.html"`,
      },
    });
  } catch (error) {
    console.error('Error generating report:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

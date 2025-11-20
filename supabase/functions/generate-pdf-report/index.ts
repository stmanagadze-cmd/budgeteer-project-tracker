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

interface VisibleCards {
  totalHours: boolean;
  totalAccumulated: boolean;
  targetBudget: boolean;
  remaining: boolean;
  progress: boolean;
}

function generateHTMLReport(project: Project, visibleCards: VisibleCards): string {
  const totalHours = project.workPeriods.reduce((sum, p) => sum + p.totalHours, 0);
  const totalCost = project.workPeriods.reduce((sum, p) => sum + p.periodCost, 0);
  const remaining = project.targetBudget - totalCost;
  const progress = (totalCost / project.targetBudget) * 100;

  // Sanitize all user-provided strings to prevent XSS
  const safeName = escapeHtml(project.name);
  
  const periodsHTML = project.workPeriods.map((period, index) => {
    // Format date without timezone conversion (YYYY-MM-DD -> MM/DD/YYYY or localized format)
    const [year, month, day] = period.date.split('-');
    const displayDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString();
    
    return `
    <div class="period">
      <h3>Period ${index + 1} - ${displayDate}</h3>
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
        <div class="images-section">
          <h4>Images</h4>
          <div class="images-grid">
            ${period.images.map(img => `
              <div class="image-container">
                <img src="${escapeHtml(img)}" alt="Work period image" onclick="openImageModal(this.src)" />
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
  }).join('');

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
        .images-section {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        .images-section h4 {
          color: #ff6b35;
          margin-bottom: 15px;
          font-size: 16px;
        }
        .images-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 15px;
        }
        .image-container {
          position: relative;
          overflow: hidden;
          border-radius: 8px;
          border: 1px solid #ddd;
          background: #f9f9f9;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .image-container:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .image-container img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          display: block;
        }
        .modal {
          display: none;
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.9);
          cursor: pointer;
        }
        .modal-content {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          max-width: 90%;
          max-height: 90%;
          object-fit: contain;
        }
        .close-modal {
          position: absolute;
          top: 20px;
          right: 35px;
          color: #f1f1f1;
          font-size: 40px;
          font-weight: bold;
          cursor: pointer;
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

      ${(visibleCards.totalHours || visibleCards.totalAccumulated || visibleCards.targetBudget || visibleCards.remaining || visibleCards.progress) ? `
      <div class="summary">
        <h2>Summary</h2>
        ${visibleCards.totalHours ? `<p><strong>Total Hours:</strong> ${totalHours.toFixed(2)}</p>` : ''}
        ${visibleCards.totalAccumulated ? `<p><strong>Total Cost:</strong> $${totalCost.toFixed(2)}</p>` : ''}
        ${visibleCards.targetBudget ? `<p><strong>Target Budget:</strong> $${project.targetBudget.toFixed(2)}</p>` : ''}
        ${visibleCards.remaining ? `<p class="remaining"><strong>Remaining Budget:</strong> $${remaining.toFixed(2)}</p>` : ''}
        ${visibleCards.progress ? `<p><strong>Progress:</strong> ${progress.toFixed(1)}%</p>` : ''}
      </div>
      ` : ''}

      <div class="periods">
        <h2>Work Periods</h2>
        ${periodsHTML}
      </div>

      <div class="footer">
        Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
      </div>

      <div id="imageModal" class="modal" onclick="closeImageModal()">
        <span class="close-modal">&times;</span>
        <img class="modal-content" id="modalImage">
      </div>

      <script>
        function openImageModal(src) {
          const modal = document.getElementById('imageModal');
          const modalImg = document.getElementById('modalImage');
          modal.style.display = 'block';
          modalImg.src = src;
        }
        
        function closeImageModal() {
          document.getElementById('imageModal').style.display = 'none';
        }
        
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape') {
            closeImageModal();
          }
        });
      </script>
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
    const { project, visibleCards, sortBy = 'date' } = await req.json() as { 
      project: Project; 
      visibleCards?: VisibleCards;
      sortBy?: 'date' | 'totalHours' | 'periodCost';
    };

    if (!project || !project.id) {
      return new Response(
        JSON.stringify({ error: 'Project data with valid ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cardsToShow = visibleCards || {
      totalHours: true,
      totalAccumulated: true,
      targetBudget: true,
      remaining: true,
      progress: true,
    };

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

    // Generate signed URLs for all work period images
    const workPeriodsWithSignedUrls = await Promise.all(
      project.workPeriods.map(async (period) => {
        if (!period.images || period.images.length === 0) {
          return period;
        }

        const signedImageUrls = await Promise.all(
          period.images.map(async (imagePath) => {
            try {
              // Extract the file path from the stored path or URL
              const urlParts = imagePath.split('/');
              const bucketIndex = urlParts.findIndex(part => part === 'work-period-images');
              
              if (bucketIndex === -1) {
                console.warn('Invalid image path format:', imagePath);
                return imagePath;
              }
              
              const filePath = urlParts.slice(bucketIndex + 1).join('/');
              
              const { data, error } = await supabaseClient.storage
                .from('work-period-images')
                .createSignedUrl(filePath, 3600); // 1 hour expiry
              
              if (error) {
                console.error('Error generating signed URL for image:', error);
                return imagePath;
              }
              
              return data.signedUrl;
            } catch (error) {
              console.error('Error processing image:', error);
              return imagePath;
            }
          })
        );

        return {
          ...period,
          images: signedImageUrls
        };
      })
    );

    // Sort work periods based on sortBy parameter
    const sortedProject = {
      ...project,
      workPeriods: workPeriodsWithSignedUrls.sort((a, b) => {
        switch (sortBy) {
          case 'date':
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          case 'totalHours':
            return b.totalHours - a.totalHours;
          case 'periodCost':
            return b.periodCost - a.periodCost;
          default:
            return 0;
        }
      })
    };

    const htmlContent = generateHTMLReport(sortedProject, cardsToShow);
    
    // Sanitize filename
    const today = new Date().toISOString().split('T')[0];
    const safeFilename = project.name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_').substring(0, 100);

    return new Response(htmlContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${safeFilename}_export_${today}.html"`,
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

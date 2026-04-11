const BACKEND = 'https://gstcopilot-backend-1.onrender.com';

function showTab(tab) {
  document.querySelectorAll('.content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-' + tab).style.display = 'block';
        event.target.classList.add('active');
        }

        async function validateGSTIN() {
          const gstin = document.getElementById('gstinInput').value.trim();
            const result = document.getElementById('gstinResult');
              if (!gstin || gstin.length !== 15) {
                  result.className = 'result error show';
                      result.innerHTML = '❌ Please enter a valid 15-digit GSTIN';
                          return;
                            }
                              result.className = 'result show';
                                result.innerHTML = '⏳ Validating...';
                                  try {
                                      const res = await fetch(`${BACKEND}/api/validate-gstin`, {
                                            method: 'POST',
                                                  headers: {'Content-Type': 'application/json'},
                                                        body: JSON.stringify({gstin})
                                                            });
                                                                const data = await res.json();
                                                                    if (data.success) {
                                                                          result.className = 'result success show';
                                                                                result.innerHTML = `✅ Valid GSTIN<br><b>Name:</b> ${data.data?.lgnm || 'N/A'}<br><b>Status:</b> ${data.data?.sts || 'N/A'}<br><b>State:</b> ${data.data?.pradr?.addr?.stcd || 'N/A'}`;
                                                                                    } else {
                                                                                          result.className = 'result error show';
                                                                                                result.innerHTML = '❌ Invalid GSTIN or not found';
                                                                                                    }
                                                                                                      } catch(e) {
                                                                                                          result.className = 'result error show';
                                                                                                              result.innerHTML = '❌ Backend error. Please try again.';
                                                                                                                }
                                                                                                                }

                                                                                                                async function lookupHSN() {
                                                                                                                  const hsn = document.getElementById('hsnInput').value.trim();
                                                                                                                    const result = document.getElementById('hsnResult');
                                                                                                                      result.className = 'result show';
                                                                                                                        result.innerHTML = '⏳ Looking up...';
                                                                                                                          try {
                                                                                                                              const res = await fetch(`${BACKEND}/api/hsn-lookup`, {
                                                                                                                                    method: 'POST',
                                                                                                                                          headers: {'Content-Type': 'application/json'},
                                                                                                                                                body: JSON.stringify({hsn})
                                                                                                                                                    });
                                                                                                                                                        const data = await res.json();
                                                                                                                                                            result.className = 'result success show';
                                                                                                                                                                result.innerHTML = `<b>HSN:</b> ${data.hsn}<br><b>Description:</b> ${data.description}<br><b>GST Rate:</b> ${data.gstRate !== null ? data.gstRate + '%' : 'N/A'}`;
                                                                                                                                                                  } catch(e) {
                                                                                                                                                                      result.className = 'result error show';
                                                                                                                                                                          result.innerHTML = '❌ Lookup failed. Try again.';
                                                                                                                                                                            }
                                                                                                                                                                            }

                                                                                                                                                                            async function generateReminder() {
                                                                                                                                                                              const clientName = document.getElementById('clientName').value.trim();
                                                                                                                                                                                const gstin = document.getElementById('clientGSTIN').value.trim();
                                                                                                                                                                                  const amount = document.getElementById('amount').value.trim();
                                                                                                                                                                                    const dueDate = document.getElementById('dueDate').value.trim();
                                                                                                                                                                                      const result = document.getElementById('reminderResult');
                                                                                                                                                                                        result.className = 'result show';
                                                                                                                                                                                          result.innerHTML = '⏳ Generating...';
                                                                                                                                                                                            try {
                                                                                                                                                                                                const res = await fetch(`${BACKEND}/api/payment-reminder`, {
                                                                                                                                                                                                      method: 'POST',
                                                                                                                                                                                                            headers: {'Content-Type': 'application/json'},
                                                                                                                                                                                                                  body: JSON.stringify({clientName, gstin, amount, dueDate})
                                                                                                                                                                                                                      });
                                                                                                                                                                                                                          const data = await res.json();
                                                                                                                                                                                                                              result.className = 'result success show';
                                                                                                                                                                                                                                  result.innerHTML = `<pre style="white-space:pre-wrap;font-size:11px;">${data.message}</pre>
                                                                                                                                                                                                                                      <button onclick="copyText('${data.message.replace(/'/g,"\\'")}\")" style="margin-top:8px;padding:4px 8px;background:#00b894;color:white;border:none;border-radius:4px;cursor:pointer;">Copy</button>`;
                                                                                                                                                                                                                                        } catch(e) {
                                                                                                                                                                                                                                            result.className = 'result error show';
                                                                                                                                                                                                                                                result.innerHTML = '❌ Failed. Try again.';
                                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                                  }

                                                                                                                                                                                                                                                  async function loadDueDates() {
                                                                                                                                                                                                                                                    const result = document.getElementById('dueDatesResult');
                                                                                                                                                                                                                                                      result.innerHTML = '⏳ Loading...';
                                                                                                                                                                                                                                                        try {
                                                                                                                                                                                                                                                            const res = await fetch(`${BACKEND}/api/due-dates`);
                                                                                                                                                                                                                                                                const data = await res.json();
                                                                                                                                                                                                                                                                    result.innerHTML = data.dueDates.map(d =>
                                                                                                                                                                                                                                                                          `<div class="due-date-item"><b>${d.form}</b> (${d.frequency})<br>Due: <span>${d.dueDate}</span></div>`
                                                                                                                                                                                                                                                                              ).join('');
                                                                                                                                                                                                                                                                                } catch(e) {
                                                                                                                                                                                                                                                                                    result.innerHTML = '❌ Failed to load due dates.';
                                                                                                                                                                                                                                                                                      }
                                                                                                                                                                                                                                                                                      }

                                                                                                                                                                                                                                                                                      async function exportPDF() {
                                                                                                                                                                                                                                                                                        const title = document.getElementById('exportTitle').value.trim();
                                                                                                                                                                                                                                                                                          const content = document.getElementById('exportContent').value.trim();
                                                                                                                                                                                                                                                                                            try {
                                                                                                                                                                                                                                                                                                const res = await fetch(`${BACKEND}/api/export-pdf`, {
                                                                                                                                                                                                                                                                                                      method: 'POST',
                                                                                                                                                                                                                                                                                                            headers: {'Content-Type': 'application/json'},
                                                                                                                                                                                                                                                                                                                  body: JSON.stringify({title, content})
                                                                                                                                                                                                                                                                                                                      });
                                                                                                                                                                                                                                                                                                                          const blob = await res.blob();
                                                                                                                                                                                                                                                                                                                              const url = URL.createObjectURL(blob);
                                                                                                                                                                                                                                                                                                                                  chrome.downloads.download({url, filename: 'gstcopilot-report.pdf'});
                                                                                                                                                                                                                                                                                                                                    } catch(e) {
                                                                                                                                                                                                                                                                                                                                        alert('Export failed. Try again.');
                                                                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                                                                          }

                                                                                                                                                                                                                                                                                                                                          async function exportExcel() {
                                                                                                                                                                                                                                                                                                                                            const title = document.getElementById('exportTitle').value.trim();
                                                                                                                                                                                                                                                                                                                                              try {
                                                                                                                                                                                                                                                                                                                                                  const res = await fetch(`${BACKEND}/api/export-excel`, {
                                                                                                                                                                                                                                                                                                                                                        method: 'POST',
                                                                                                                                                                                                                                                                                                                                                              headers: {'Content-Type': 'application/json'},
                                                                                                                                                                                                                                                                                                                                                                    body: JSON.stringify({headers: ['Report', 'Data'], rows: [[title, new Date().toLocaleDateString()]]})
                                                                                                                                                                                                                                                                                                                                                                        });
                                                                                                                                                                                                                                                                                                                                                                            const blob = await res.blob();
                                                                                                                                                                                                                                                                                                                                                                                const url = URL.createObjectURL(blob);
                                                                                                                                                                                                                                                                                                                                                                                    chrome.downloads.download({url, filename: 'gstcopilot-export.xlsx'});
                                                                                                                                                                                                                                                                                                                                                                                      } catch(e) {
                                                                                                                                                                                                                                                                                                                                                                                          alert('Export failed. Try again.');
                                                                                                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                                                                                                            }

                                                                                                                                                                                                                                                                                                                                                                                            function copyText(text) {
                                                                                                                                                                                                                                                                                                                                                                                              navigator.clipboard.writeText(text);
                                                                                                                                                                                                                                                                                                                                                                                                alert('Copied!');
                                                                                                                                                                                                                                                                                                                                                                                                }
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      const tabName = this.getAttribute('data-tab');
      if (tabName) showTab(tabName);
    });
  });
});

document.addEventListener('DOMContentLoaded', function() {
  var vBtn = document.getElementById('validateBtn');
  if (vBtn) vBtn.addEventListener('click', validateGSTIN);
  var hBtn = document.getElementById('hsnBtn');
  if (hBtn) hBtn.addEventListener('click', lookupHSN);
  var rBtn = document.getElementById('reminderBtn');
  if (rBtn) rBtn.addEventListener('click', saveReminder);
});

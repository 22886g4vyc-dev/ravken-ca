const header = document.getElementById('siteHeader');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 20);
});

/* Mobile navigation. Below 820px the link list is hidden until the button
   opens it; the button reports its state to assistive tech via aria-expanded. */
const navToggle = document.getElementById('navToggle');
if (navToggle) {
  const setOpen = (open) => {
    header.classList.toggle('nav-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  navToggle.addEventListener('click', () => setOpen(!header.classList.contains('nav-open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  document.addEventListener('click', (e) => { if (!header.contains(e.target)) setOpen(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 820) setOpen(false); });
}

const obs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); obs.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

// project map (About page) — click a pin to open a popup bubble above it
const mapCanvas = document.getElementById('map-canvas');
const popup = document.getElementById('map-popup');
if (mapCanvas && popup) {
  const closePopup = () => {
    popup.hidden = true;
    document.querySelectorAll('.territory-map .pin').forEach(p => p.classList.remove('active'));
  };
  document.querySelectorAll('.territory-map .pin').forEach(pin => {
    const show = () => {
      document.querySelectorAll('.territory-map .pin').forEach(p => p.classList.remove('active'));
      pin.classList.add('active');
      const canvasRect = mapCanvas.getBoundingClientRect();
      const pinRect = pin.getBoundingClientRect();
      const left = (pinRect.left + pinRect.width / 2) - canvasRect.left;
      const top = (pinRect.top + pinRect.height / 2) - canvasRect.top;
      popup.style.left = `${left}px`;
      popup.style.top = `${top}px`;
      popup.innerHTML = `<span class="terr">${pin.dataset.kind}</span><h3>${pin.dataset.name}</h3><p>${pin.dataset.note}</p>`;
      popup.hidden = false;
    };
    pin.addEventListener('click', (e) => { e.stopPropagation(); show(); });
    pin.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } });
  });
  document.addEventListener('click', (e) => { if (!mapCanvas.contains(e.target)) closePopup(); });
}

/* ---------------------------------------------------------------------------
   Forms: contact (contact.html), careers expression of interest (careers.html)
   and subcontractor / supplier registration (work-with-us.html).

   All three POST to FORM_ENDPOINT — the Formspree form that emails
   chaz@ravken.ca. Each form carries a hidden `form` field naming which one it
   is and a `_subject` so the inbox can be filtered. Nothing is stored anywhere
   else.

   While FORM_ENDPOINT is an empty string every form is DELIBERATELY disabled
   and says so on the page. That is the safe failure: an enquiry can never be
   typed, sent, and silently lost. Paste the URL below and the forms go live.

   File uploads (the careers résumé) are sent as multipart form data. If the
   mail service refuses the attachment, the submission is retried without it
   and the applicant is told to email the résumé — the details are never lost.
--------------------------------------------------------------------------- */
const FORM_ENDPOINT = 'https://formspree.io/f/xoeagkyw';
/* Optional per-form endpoints. Leave empty and the form uses FORM_ENDPOINT.
   When careers@ravken.ca exists, create a second Formspree form that delivers
   to it and paste that form's URL as `careers` — nothing else to change. */
const FORM_ENDPOINTS = { careers: 'https://formspree.io/f/mbgrnzeb' };
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/* contact.html#capability — arrived from "Request our capability statement":
   pre-fill the message so the request is one click and one send. */
const contactMsg = document.querySelector('form[data-form="contact"] textarea[name="message"]');
if (contactMsg && location.hash === '#capability') {
  const subj = document.querySelector('form[data-form="contact"] input[name="_subject"]');
  if (subj) subj.value = 'Capability statement request — ravken.ca';
  if (!contactMsg.value) contactMsg.value = "Please send me Ravken's current capability statement.";
  document.querySelector('form[data-form="contact"]').scrollIntoView({ block: 'start' });
}

document.querySelectorAll('form[data-form]').forEach((form) => {
  const statusEl = form.querySelector('.cf-status');
  const submitBtn = form.querySelector('button[type=submit]');
  const fields = form.querySelectorAll('input, textarea, select, button');
  const endpoint = FORM_ENDPOINTS[form.dataset.form] || FORM_ENDPOINT;
  const email = form.dataset.email || 'chaz@ravken.ca';
  const MAILTO = `<a href="mailto:${email}">${email}</a>`;

  const say = (kind, html) => {
    statusEl.className = `cf-status show ${kind}`;
    statusEl.innerHTML = html;
  };

  if (!endpoint) {
    fields.forEach(el => { el.disabled = true; });
    say('err', `This form isn't connected to a mail service yet, so it can't send. Please email ${MAILTO} directly.`);
    return;
  }

  const post = async (body, json) => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: json ? { 'Content-Type': 'application/json', 'Accept': 'application/json' } : { 'Accept': 'application/json' },
      body
    });
    if (!res.ok) throw new Error(`the mail service returned ${res.status}${res.statusText ? ' ' + res.statusText : ''}`);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (form.elements._gotcha && form.elements._gotcha.value) return; // bot

    const fileInput = form.querySelector('input[type=file]');
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (file && file.size > MAX_UPLOAD_BYTES) {
      say('err', 'That file is larger than 5 MB. Please attach a smaller copy, or leave it off and email it to us afterwards.');
      fileInput.focus();
      return;
    }

    const original = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    statusEl.className = 'cf-status';

    const data = new FormData(form);
    const plain = Object.fromEntries([...data.entries()].filter(([, v]) => !(v instanceof File)));
    const doneMsg = form.dataset.success || 'Thank you — your message has been sent. You will get a reply at the address you gave.';

    try {
      if (file) {
        try {
          await post(data, false);
          form.reset();
          say('ok', doneMsg);
        } catch (err) {
          // Retry without the attachment so the applicant's details still arrive.
          await post(JSON.stringify(plain), true);
          form.reset();
          say('ok', `${doneMsg} The attachment could not be sent with the form — please email it to ${MAILTO} and mention your name.`);
          console.warn('[form] attachment refused, details sent without it:', err);
        }
      } else {
        await post(JSON.stringify(plain), true);
        form.reset();
        say('ok', doneMsg);
      }
    } catch (err) {
      say('err', `Your message did not send — ${err.message}. Nothing was received on our end, so please email ${MAILTO} directly rather than waiting for a reply.`);
      console.error('[form] submission failed:', err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  });
});

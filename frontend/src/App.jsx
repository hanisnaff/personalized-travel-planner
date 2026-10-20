import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowLeft, ArrowRight, Bookmark, CalendarDays, Check, ChevronDown,
  CircleHelp, Compass, Download, Globe2, Heart, Hotel, Leaf, MapPin, Menu, MoreHorizontal,
  Plane, Plus, RefreshCw, Search, Settings2, Sparkles, Trash2, Wallet, X, Clock3,
  Utensils, Footprints, Landmark, Mountain, Waves, Coffee, Sun, Map, SlidersHorizontal
} from 'lucide-react';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const INTERESTS = ['Food', 'Culture', 'Nature', 'Adventure', 'Shopping', 'Sightseeing', 'Nightlife', 'Relaxation'];
const DEFAULT_FORM = { destination: '', departure_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), duration: '3', budget: '15000', currency: 'INR', travelers: '2', interests: ['Culture', 'Food', 'Sightseeing'], travel_style: 'Balanced', accommodation: 'Hotel' };
const fmt = (amount, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount || 0));

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try { const data = await response.json(); message = data.detail || message; } catch { /* response may be empty */ }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

function App() {
  const [page, setPage] = useState('plan');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [itinerary, setItinerary] = useState(null);
  const [savedTrips, setSavedTrips] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [health, setHealth] = useState({ ai_configured: false, database: 'sqlite' });
  const [search, setSearch] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    api('/api/health').then(setHealth).catch(() => setHealth({ ai_configured: false, database: 'local demo' }));
    refreshTrips();
  }, []);

  async function refreshTrips() {
    setLoadingTrips(true);
    try { setSavedTrips(await api('/api/trips')); }
    catch { setSavedTrips([]); }
    finally { setLoadingTrips(false); }
  }

  function updateForm(key, value) { setForm(current => ({ ...current, [key]: value })); }
  function toggleInterest(value) {
    updateForm('interests', form.interests.includes(value) ? form.interests.filter(item => item !== value) : [...form.interests, value]);
  }
  function toPayload() {
    return { ...form, duration: Number(form.duration), budget: Number(form.budget), travelers: Number(form.travelers) };
  }

  async function generate(event) {
    event?.preventDefault();
    setError(''); setNotice('');
    if (!form.destination.trim()) { setError('Enter a destination to get started.'); return; }
    if (!form.departure_date || Number(form.duration) < 1 || Number(form.budget) <= 0 || form.interests.length === 0) { setError('Check your dates, budget, duration, and choose at least one interest.'); return; }
    setLoading(true);
    try {
      const result = await api('/api/itineraries/generate', { method: 'POST', body: JSON.stringify(toPayload()) });
      setItinerary(result); setActiveTrip(null); setDirty(false); setPage('plan');
      setNotice(result.source === 'demo' ? 'Demo itinerary ready. Configure an AI API key for provider-generated plans.' : 'Your personalized itinerary is ready.');
      document.querySelector('.results-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) { setError(`${err.message}. Make sure the backend is running.`); }
    finally { setLoading(false); }
  }

  async function saveTrip() {
    if (!itinerary) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const saved = await api(activeTrip ? `/api/trips/${activeTrip.id}` : '/api/trips', { method: activeTrip ? 'PUT' : 'POST', body: JSON.stringify({ request: toPayload(), itinerary }) });
      await refreshTrips(); setActiveTrip(saved); setDirty(false); setNotice(activeTrip ? 'Your saved itinerary has been updated.' : 'Trip saved to your collection.');
    } catch (err) { setError(`${err.message}. Check that the backend is running.`); }
    finally { setSaving(false); }
  }

  async function deleteTrip(id) {
    try { await api(`/api/trips/${id}`, { method: 'DELETE' }); setSavedTrips(items => items.filter(item => item.id !== id)); if (activeTrip?.id === id) setActiveTrip(null); setNotice('Trip deleted.'); }
    catch (err) { setError(err.message); }
  }

  function openTrip(trip) {
    setActiveTrip(trip); setDirty(false); setItinerary(trip.itinerary);
    setForm({ destination: trip.destination, departure_date: trip.departure_date, duration: String(trip.duration), budget: String(trip.budget), currency: trip.currency || 'INR', travelers: '1', interests: ['Sightseeing'], travel_style: 'Balanced', accommodation: 'No preference' });
    setPage('plan'); setNotice('Opened a saved itinerary.'); setError('');
  }

  function updateActivity(dayIndex, activityIndex, key, value) {
    setItinerary(current => ({ ...current, days: current.days.map((day, di) => di !== dayIndex ? day : ({ ...day, activities: day.activities.map((activity, ai) => ai !== activityIndex ? activity : ({ ...activity, [key]: key === 'estimated_cost' ? Math.max(0, Number(value) || 0) : value })) })) }));
    setDirty(true);
  }
  function removeActivity(dayIndex, activityIndex) {
    setItinerary(current => ({ ...current, days: current.days.map((day, di) => di !== dayIndex ? day : ({ ...day, activities: day.activities.filter((_, ai) => ai !== activityIndex) })) }));
    setDirty(true);
  }
  function downloadItinerary() {
    if (!itinerary) return;
    const text = [`${itinerary.title}`, itinerary.summary, '', ...itinerary.days.flatMap(day => [`DAY ${day.day}: ${day.title}`, ...day.activities.map(a => `${a.time} — ${a.title} (${fmt(a.estimated_cost, itinerary.currency)})\n${a.description}`), '']), 'Food suggestions:', ...itinerary.food_suggestions.map(s => `• ${s}`), '', 'Travel tips:', ...itinerary.travel_tips.map(s => `• ${s}`)].join('\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${form.destination || 'trip'}-itinerary.txt`.replace(/[^a-z0-9.-]/gi, '-'); a.click(); URL.revokeObjectURL(url);
  }

  const filteredTrips = useMemo(() => savedTrips.filter(trip => trip.destination?.toLowerCase().includes(search.toLowerCase())), [savedTrips, search]);
  const totalActivities = itinerary?.days.reduce((sum, day) => sum + day.activities.length, 0) || 0;
  const calculatedTotal = itinerary?.days.reduce((sum, day) => sum + day.activities.reduce((s, activity) => s + Number(activity.estimated_cost || 0), 0), 0) || 0;
  const navItems = [{ id: 'plan', label: 'Plan a trip', icon: Compass }, { id: 'saved', label: 'My trips', icon: Bookmark }];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Plane size={20} /></div><div><strong>wayfarer<span>.</span></strong><small>YOUR TRAVEL STUDIO</small></div><button className="icon-btn close-menu" onClick={() => setMobileMenu(false)} aria-label="Close menu"><X size={18} /></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{navItems.map(item => <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => { setPage(item.id); setMobileMenu(false); setError(''); }}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'saved' && savedTrips.length > 0 && <span className="nav-count">{savedTrips.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={18} /></div><strong>Need a little inspiration?</strong><p>Start with a destination and we'll help with the details.</p><button onClick={() => { setForm(DEFAULT_FORM); setItinerary(null); setActiveTrip(null); setDirty(false); setPage('plan'); }}>Explore ideas <ArrowRight size={14} /></button></div><div className="profile"><div className="avatar">W</div><div className="profile-copy"><strong>My travel space</strong><small>Personal planner</small></div><MoreHorizontal size={18} className="muted" /></div></div>
    </aside>
    {mobileMenu && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileMenu(false)} />}
    <main className="main-content">
      <header className="topbar"><button className="icon-btn mobile-menu-btn" onClick={() => setMobileMenu(true)} aria-label="Open menu"><Menu size={21} /></button><div className="breadcrumb"><span>Workspace</span><span className="slash">/</span><strong>{page === 'saved' ? 'My trips' : 'Trip planner'}</strong></div><div className="top-actions"><div className="status-pill"><span className={`status-dot ${health.ai_configured ? 'online' : ''}`} />{health.ai_configured ? 'AI connected' : 'Demo mode'}</div><button className="icon-btn settings-btn" title={`Storage: ${health.database}`}><Settings2 size={18} /></button><div className="avatar top-avatar">W</div></div></header>
      <div className="page-wrap">
        {page === 'saved' ? <section className="saved-page">
          <div className="page-heading"><div><div className="eyebrow">YOUR COLLECTION</div><h1>Trips worth remembering<span>.</span></h1><p>Keep your plans in one place, ready whenever you are.</p></div><button className="primary-btn" onClick={() => { setPage('plan'); setItinerary(null); setActiveTrip(null); setDirty(false); }}><Plus size={17} /> Plan a new trip</button></div>
          <div className="saved-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search destinations..." /></div><span>{filteredTrips.length} {filteredTrips.length === 1 ? 'trip' : 'trips'} saved</span></div>
          {loadingTrips ? <div className="empty-state"><RefreshCw className="spin" size={24} /><p>Loading your trips…</p></div> : filteredTrips.length === 0 ? <div className="empty-state"><div className="empty-icon"><MapPin size={24} /></div><h3>{search ? 'No destinations found' : 'Your next adventure starts here'}</h3><p>{search ? 'Try another destination name.' : 'Once you save an itinerary, it will show up here.'}</p>{!search && <button className="primary-btn" onClick={() => setPage('plan')}>Create your first trip <ArrowRight size={16} /></button>}</div> : <div className="saved-grid">{filteredTrips.map(trip => <article className="saved-card" key={trip.id}><div className={`trip-cover cover-${Math.abs((trip.destination || 'a').charCodeAt(0)) % 5}`}><span className="cover-chip"><MapPin size={13} /> {trip.destination}</span><div className="cover-art"><Globe2 size={68} strokeWidth={0.8} /></div><span className="cover-duration">{trip.duration} days</span></div><div className="saved-card-body"><div className="saved-card-title"><div><h3>{trip.destination}</h3><p><CalendarDays size={14} /> {trip.departure_date}</p></div><button className="icon-btn delete-btn" onClick={() => deleteTrip(trip.id)} title="Delete trip" aria-label="Delete trip"><Trash2 size={16} /></button></div><div className="saved-card-footer"><span><Wallet size={15} /> {fmt(trip.budget, trip.currency)}</span><button onClick={() => openTrip(trip)}>View itinerary <ArrowRight size={14} /></button></div></div></article>)}</div>}
        </section> : <>
          <section className="hero"><div className="hero-copy"><div className="eyebrow"><Sparkles size={13} /> LESS PLANNING, MORE WANDERING</div><h1>Your next chapter<br />starts <em>somewhere.</em></h1><p>Thoughtful itineraries, tailored to your pace, your passions, and the way you love to travel.</p><div className="hero-proof"><div className="proof-avatars"><span>A</span><span>M</span><span>J</span></div><span>Made for curious travelers</span><span className="proof-separator">·</span><span className="rating-stars">★★★★★</span></div></div><div className="hero-visual"><div className="sun-disc" /><div className="hill hill-back" /><div className="hill hill-front" /><div className="hero-route route-one" /><div className="hero-pin pin-one"><MapPin size={16} fill="currentColor" /></div><div className="hero-pin pin-two"><MapPin size={14} fill="currentColor" /></div><div className="postcard"><span>YOUR NEXT STOP</span><strong>Somewhere<br />wonderful.</strong><div className="postcard-bottom"><span>Discover more</span><ArrowDownRight size={17} /></div></div><div className="floating-note"><div className="note-icon"><CalendarDays size={16} /></div><div><strong>A little time away</strong><small>Can change everything</small></div></div></div></section>
          <div className="section-label"><span>01</span><span className="section-line" /><span>MAKE IT YOURS</span></div>
          <section className="planner-layout">
            <form className="planner-card" onSubmit={generate}>
              <div className="card-heading"><div><h2>Design your getaway</h2><p>The details make the difference.</p></div><div className="step-indicator"><span>STEP</span><strong>01 <i>/ 02</i></strong></div></div>
              <div className="form-section"><label className="field-label" htmlFor="destination">Where to? <span className="required">*</span></label><div className="input-with-icon"><MapPin size={17} /><input id="destination" value={form.destination} onChange={e => updateForm('destination', e.target.value)} placeholder="e.g. Kyoto, Japan" maxLength={100} required /></div><span className="field-hint">A city, a country, or somewhere off the map.</span></div>
              <div className="form-grid"><div className="form-section"><label className="field-label" htmlFor="departure">When are you leaving? <span className="required">*</span></label><div className="input-with-icon"><CalendarDays size={16} /><input id="departure" type="date" min={new Date().toISOString().slice(0, 10)} value={form.departure_date} onChange={e => updateForm('departure_date', e.target.value)} required /></div></div><div className="form-section"><label className="field-label" htmlFor="duration">How long?</label><div className="select-wrap"><select id="duration" value={form.duration} onChange={e => updateForm('duration', e.target.value)}>{[1,2,3,4,5,6,7,8,9,10,12,14,21].map(n => <option key={n} value={n}>{n} {n === 1 ? 'day' : 'days'}</option>)}</select><ChevronDown size={16} /></div></div></div>
              <div className="form-grid budget-grid"><div className="form-section"><label className="field-label" htmlFor="budget">What's your total budget?</label><div className="budget-input"><span>{form.currency === 'INR' ? '₹' : form.currency === 'USD' ? '$' : form.currency === 'EUR' ? '€' : '£'}</span><input id="budget" type="number" min="1" max="100000000" value={form.budget} onChange={e => updateForm('budget', e.target.value)} required /><div className="currency-select"><select aria-label="Currency" value={form.currency} onChange={e => updateForm('currency', e.target.value)}><option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option></select><ChevronDown size={12} /></div></div></div><div className="form-section"><label className="field-label" htmlFor="travelers">Travelers</label><div className="select-wrap"><select id="travelers" value={form.travelers} onChange={e => updateForm('travelers', e.target.value)}>{Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} {n === 1 ? 'traveler' : 'travelers'}</option>)}</select><ChevronDown size={16} /></div></div></div>
              <div className="form-section"><div className="field-label">What are you in the mood for? <span className="optional">Pick a few</span></div><div className="interest-grid">{INTERESTS.map((interest, i) => <button type="button" key={interest} className={`interest-chip ${form.interests.includes(interest) ? 'selected' : ''}`} onClick={() => toggleInterest(interest)}>{[<Utensils size={15} />, <Landmark size={15} />, <Leaf size={15} />, <Mountain size={15} />, <Heart size={15} />, <Map size={15} />, <Sun size={15} />, <Waves size={15} />][i]}<span>{interest}</span>{form.interests.includes(interest) && <Check size={13} className="chip-check" />}</button>)}</div></div>
              <div className="form-grid"><div className="form-section"><label className="field-label" htmlFor="style">Travel pace</label><div className="select-wrap"><select id="style" value={form.travel_style} onChange={e => updateForm('travel_style', e.target.value)}><option>Budget</option><option>Balanced</option><option>Comfort</option><option>Luxury</option></select><ChevronDown size={16} /></div></div><div className="form-section"><label className="field-label" htmlFor="stay">Stay preference</label><div className="select-wrap"><select id="stay" value={form.accommodation} onChange={e => updateForm('accommodation', e.target.value)}><option>No preference</option><option>Hostel</option><option>Hotel</option><option>Resort</option><option>Homestay</option></select><ChevronDown size={16} /></div></div></div>
              {error && <div className="alert error-alert"><X size={16} /><span>{error}</span></div>}
              <button className="generate-btn" type="submit" disabled={loading}>{loading ? <><span className="button-spinner" /> Building your itinerary…</> : <><Sparkles size={17} /> Create my itinerary <ArrowRight size={17} /></>}</button>
              <div className="secure-note"><Leaf size={13} /> Personal, flexible, and yours to change.</div>
            </form>
            <aside className="planner-aside"><div className="aside-note"><div className="aside-note-icon"><Sparkles size={18} /></div><span className="aside-kicker">A BETTER WAY TO GET AWAY</span><h3>Good trips don't happen by accident.</h3><p>They start with a few good questions. We'll turn your answers into a plan you can make your own.</p><div className="aside-rule" /><div className="aside-benefit"><span><Check size={14} /></span><div><strong>Your kind of travel</strong><small>Built around what you actually enjoy.</small></div></div><div className="aside-benefit"><span><Check size={14} /></span><div><strong>Your budget, respected</strong><small>Estimated costs help you plan ahead.</small></div></div><div className="aside-benefit"><span><Check size={14} /></span><div><strong>Room to be spontaneous</strong><small>Edit every detail as you go.</small></div></div></div><div className="quote-card"><div className="quote-mark">“</div><p>We travel not to escape life, but for life not to escape us.</p><span>— ROBIN YOUNG</span><div className="quote-decoration"><Compass size={52} strokeWidth={0.7} /></div></div></aside>
          </section>
          <div className="results-anchor" />
          {notice && <div className="alert success-alert"><Check size={16} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
          {itinerary && <section className="results-section"><div className="results-heading"><div><div className="eyebrow">YOUR JOURNEY, MAPPED OUT</div><h2>{itinerary.title}</h2><p>{itinerary.summary}</p><div className="result-badges"><span><CalendarDays size={14} /> {itinerary.days.length} days</span><span><Footprints size={14} /> {totalActivities} activities</span><span className={itinerary.source === 'demo' ? 'demo-badge' : 'ai-badge'}><Sparkles size={14} /> {itinerary.source === 'demo' ? 'Demo itinerary' : 'AI generated'}</span></div></div><div className="results-actions"><button className="secondary-btn" onClick={downloadItinerary}><Download size={16} /> Export</button><button className="secondary-btn" onClick={generate} disabled={loading}><RefreshCw size={15} /> Regenerate</button><button className="primary-btn" onClick={saveTrip} disabled={saving || Boolean(activeTrip && !dirty)}>{saving ? 'Saving…' : activeTrip && !dirty ? <><Check size={16} /> Saved</> : activeTrip ? <><Bookmark size={16} /> Save changes</> : <><Bookmark size={16} /> Save trip</>}</button></div></div>
            <div className="budget-overview"><div className="budget-overview-icon"><Wallet size={20} /></div><div className="budget-stat"><span>YOUR BUDGET</span><strong>{fmt(form.budget, form.currency)}</strong></div><div className="budget-divider" /><div className="budget-stat"><span>ESTIMATED ACTIVITIES</span><strong>{fmt(calculatedTotal, itinerary.currency)}</strong></div><div className="budget-divider" /><div className="budget-stat"><span>REMAINING BUDGET*</span><strong className={Number(form.budget) - calculatedTotal < 0 ? 'over-budget' : ''}>{fmt(Number(form.budget) - calculatedTotal, form.currency)}</strong></div><span className="budget-footnote">*Activity estimates only; transport and lodging may be additional.</span></div>
            <div className="days-list">{itinerary.days.map((day, di) => <article className="day-card" key={day.day}><div className="day-heading"><div className="day-number">{String(day.day).padStart(2, '0')}</div><div className="day-title"><span>DAY {day.day}</span><h3>{day.title}</h3></div><div className="day-total"><span>DAY ESTIMATE</span><strong>{fmt(day.activities.reduce((s, a) => s + Number(a.estimated_cost || 0), 0), itinerary.currency)}</strong></div></div><div className="timeline">{day.activities.map((activity, ai) => <div className="activity-row" key={activity.id || `${day.day}-${ai}`}><div className="activity-time">{activity.time}</div><div className="timeline-track"><span className="timeline-dot" /></div><div className="activity-content"><div className="activity-topline"><span className="activity-category">{activity.category}</span><button className="activity-delete" title="Remove activity" onClick={() => removeActivity(di, ai)}><Trash2 size={14} /></button></div><input className="activity-title-input" aria-label="Activity title" value={activity.title} onChange={e => updateActivity(di, ai, 'title', e.target.value)} /><textarea className="activity-description" aria-label="Activity description" value={activity.description} rows={2} onChange={e => updateActivity(di, ai, 'description', e.target.value)} /><div className="activity-bottom"><span><Clock3 size={13} /> Suggested time</span><label className="cost-edit">Cost <span>{itinerary.currency === 'INR' ? '₹' : itinerary.currency === 'USD' ? '$' : itinerary.currency === 'EUR' ? '€' : '£'}</span><input type="number" min="0" aria-label="Estimated activity cost" value={activity.estimated_cost} onChange={e => updateActivity(di, ai, 'estimated_cost', e.target.value)} /></label></div></div></div>)}</div></article>)}</div>
            <div className="recommendations-grid"><article className="recommendation-card"><div className="recommendation-title"><div className="recommendation-icon food-icon"><Coffee size={17} /></div><div><h3>Something delicious</h3><p>Food ideas for the road</p></div></div><ul>{itinerary.food_suggestions.map((item, i) => <li key={i}><span><Check size={12} /></span>{item}</li>)}</ul></article><article className="recommendation-card"><div className="recommendation-title"><div className="recommendation-icon tip-icon"><Compass size={17} /></div><div><h3>A few good-to-knows</h3><p>Travel a little wiser</p></div></div><ul>{itinerary.travel_tips.map((item, i) => <li key={i}><span><Check size={12} /></span>{item}</li>)}</ul></article></div>
            {itinerary.source === 'demo' && <div className="disclaimer"><CircleHelp size={16} /><p><strong>About this itinerary:</strong> This is a demo-generated starting point. Activities, prices, opening hours, and availability have not been verified live. Confirm details with official sources before booking.</p></div>}
          </section>}
          {!itinerary && <section className="inspiration-strip"><div className="inspiration-icon"><Globe2 size={21} /></div><div><strong>A little inspiration goes a long way.</strong><p>Try a destination you've always wanted to see. Your first draft is just a starting point.</p></div><button onClick={() => { updateForm('destination', 'Jaipur, India'); updateForm('interests', ['Culture', 'Food', 'Shopping']); }}>Try Jaipur <ArrowRight size={15} /></button></section>}
          <footer className="footer"><span>© 2026 Wayfarer Travel Studio</span><span>Made for the journey, not just the destination.</span><button onClick={() => setNotice('Remember to verify travel details with official sources before booking.')}><CircleHelp size={13} /> Travel responsibly</button></footer>
        </>}
        {page === 'plan' && notice && !itinerary && <div className="alert success-alert global-notice"><Check size={16} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
      </div>
    </main>
  </div>;
}

export default App;

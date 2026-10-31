import React, { useRef, useState } from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { api, AIVisionResult } from '../services/api';
import { IssueType, IssueSeverity } from '../types';
import {
  Camera,
  MapPin,
  Sparkles,
  CheckCircle2,
  UploadCloud,
  FileText,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Search,
} from 'lucide-react';

export function CitizenReportPage() {
  const navigate = useNavigate();
  const idempotencyKey = useRef(crypto.randomUUID());
  const submissionFingerprint = useRef('');

  const [issueType, setIssueType] = useState<IssueType>('Pothole');
  const [description, setDescription] = useState('');
  const [streetName, setStreetName] = useState('Sector 4 Road');
  const [severity, setSeverity] = useState<IssueSeverity>('High');
  const [contactEmail, setContactEmail] = useState('');

  // Image Upload & AI Scan state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [aiResult, setAiResult] = useState<AIVisionResult | null>(null);
  const [analysisUnavailable, setAnalysisUnavailable] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [submittedAiStatus, setSubmittedAiStatus] = useState<'analyzed' | 'not_analyzed' | 'no_image' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const problemTypes: IssueType[] = [
    'Pothole',
    'Broken Streetlight',
    'Blocked Drainage',
    'Garbage Accumulation',
    'Water Leakage',
    'Traffic Congestion',
    'Damaged Sidewalk',
    'Road Obstruction',
    'Waterlogging',
    'Road Damage',
    'Other Urban Infrastructure',
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setErrorMsg('');
      setAiResult(null);
      setAnalysisUnavailable(false);
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setSelectedFile(null);
        setImagePreview(null);
        setErrorMsg('Choose a JPEG, PNG, or WEBP image.');
        e.target.value = '';
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setSelectedFile(null);
        setImagePreview(null);
        setErrorMsg('Image must be 8 MB or smaller.');
        e.target.value = '';
        return;
      }
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));

      // Trigger AI Scanner
      setIsScanning(true);
      try {
        const result = await api.analyzeImage(file);
        setAiResult(result);
        if (result.detected && problemTypes.includes(result.category as IssueType)) setIssueType(result.category as IssueType);
        if (result.detected) setSeverity(result.severity);
      } catch (error) {
        setAnalysisUnavailable(true);
        setErrorMsg(`${error instanceof Error ? error.message : 'Image analysis failed.'} You can continue by selecting the category and describing the issue manually.`);
      } finally { setIsScanning(false); }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');

    const fingerprint = JSON.stringify({ issueType, description, streetName, severity, contactEmail, image: selectedFile ? `${selectedFile.name}:${selectedFile.size}:${selectedFile.lastModified}` : '' });
    if (submissionFingerprint.current !== fingerprint) {
      submissionFingerprint.current = fingerprint;
      idempotencyKey.current = crypto.randomUUID();
    }

    const formData = new FormData();
    formData.append('issueType', issueType);
    formData.append('description', description);
    formData.append('streetName', streetName);
    formData.append('severity', severity);
    formData.append('contactEmail', contactEmail);
    formData.append('latitude', '12.9716');
    formData.append('longitude', '77.5946');

    if (selectedFile) {
      formData.append('photo', selectedFile);
    }

    try {
      const { report } = await api.createReport(formData, idempotencyKey.current);
      setSubmittedReportId(report.reportId);
      setSubmittedAiStatus(report.aiAnalysisStatus || (selectedFile ? 'not_analyzed' : 'no_image'));
      submissionFingerprint.current = '';
      idempotencyKey.current = crypto.randomUUID();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Report submission failed.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="flex h-screen w-screen bg-[#060a12] text-slate-100 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        <Header />

        <main className="max-w-4xl mx-auto w-full p-6 lg:p-10 space-y-8">
          {/* Top Banner */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 text-xs font-semibold">
              <Camera className="w-3.5 h-3.5" /> Mobile-First Citizen Reporting
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100">Report an Infrastructure Issue</h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Upload a photo or detail street damage. Our AI Priority Engine will analyze the report, assign tracking ID, and alert response crews.
            </p>
          </div>

          {submittedReportId ? (
            /* Success Screen */
            <div className="glass-panel-glow p-8 rounded-2xl text-center space-y-6 max-w-xl mx-auto border border-cyan-500/40">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-slate-100">Report Submitted Successfully</h2>
                <p className="text-xs text-slate-400">Your report has been logged into the NagarDrishti Digital Twin.</p>
                {submittedAiStatus && <p className="text-xs text-slate-400">{submittedAiStatus === 'analyzed' ? 'Image analysis was saved with this report.' : submittedAiStatus === 'not_analyzed' ? 'This report was saved without AI analysis and requires manual review.' : 'No image analysis was requested for this report.'}</p>}
              </div>

              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-1">
                <span className="text-xs text-slate-400 block">Tracking ID:</span>
                <span className="text-2xl font-extrabold font-mono text-cyan-400 tracking-wider">
                  {submittedReportId}
                </span>
              </div>

              <div className="flex flex-wrap gap-3 justify-center pt-2">
                <button
                  onClick={() => navigate(`/tracker?id=${submittedReportId}`)}
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl transition flex items-center gap-2"
                >
                  <span>Track Status Live</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSubmittedReportId(null);
                    setSubmittedAiStatus(null);
                    setDescription('');
                    setImagePreview(null);
                    setSelectedFile(null);
                    setAiResult(null);
                    setAnalysisUnavailable(false);
                  }}
                  className="px-6 py-3 glass-panel hover:bg-slate-800 text-slate-200 font-bold text-xs rounded-xl transition"
                >
                  Report Another Problem
                </button>
              </div>
            </div>
          ) : (
            /* Main Report Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMsg && <div role="alert" className="p-4 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4" />{errorMsg}</div>}
              {/* Photo Upload & AI Vision Box */}
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300">
                  Step 1: Upload Photo (AI Computer Vision Scanner)
                </label>

                <div className="relative border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 text-center bg-slate-900/60 transition group cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  />
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img src={imagePreview} alt="Uploaded problem" className="max-h-56 mx-auto rounded-xl object-cover shadow-lg border border-slate-800" />
                      <p className="text-xs text-slate-400">Click or drag to replace image</p>
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 text-cyan-400 flex items-center justify-center mx-auto group-hover:scale-110 transition">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-semibold text-slate-200">Drag & drop photo here or click to browse</p>
                      <p className="text-[11px] text-slate-500">Supports JPG, PNG, WEBP up to 8MB</p>
                    </div>
                  )}
                </div>

                {/* AI Scanning Feedback */}
                {isScanning && (
                  <div className="p-4 bg-cyan-950/60 border border-cyan-800 rounded-xl flex items-center gap-3 text-cyan-300 text-xs animate-pulse">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    <span>Analyzing Image with AI Computer Vision... Detecting damage patterns...</span>
                  </div>
                )}

                {aiResult && !isScanning && (
                  <div className="glass-panel-glow p-4 rounded-xl space-y-2 border border-cyan-500/40">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-cyan-400" /> Groq Image Analysis
                      </span>
                      <span className="font-mono text-cyan-400 font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                        {(aiResult.confidence * 100).toFixed(0)}% Confidence
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-200 pt-1">
                      <div>
                        Detected Issue: <strong className="text-slate-100">{aiResult.category}</strong>
                      </div>
                      <div>
                        Visual Severity Estimate: <strong className="text-amber-400">{aiResult.severity}</strong>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300">{aiResult.description}</p>
                    <p className="text-[11px] text-slate-400">Severity basis: {aiResult.severityExplanation}</p>
                    <p className="text-[11px] text-slate-400">Recommended action: {aiResult.recommendedAction}</p>
                    {aiResult.evidence.length > 0 && <p className="text-[11px] text-slate-400">Visual evidence: {aiResult.evidence.join(' · ')}</p>}
                    <p className="text-[11px] text-amber-300">{aiResult.requiresHumanReview ? 'Human review requested.' : 'AI classification; municipal review still applies.'} Visual analysis does not establish actual public safety risk. Please correct the category below if needed.</p>
                  </div>
                )}
                {analysisUnavailable && !isScanning && <p role="status" className="text-xs text-amber-300">AI analysis unavailable. This report will be marked as not analyzed; you can still submit it manually.</p>}
              </div>

              {/* Form Details */}
              <div className="glass-panel p-6 rounded-2xl space-y-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300">
                  Step 2: Problem Categorization & Description
                </label>

                {/* Problem Types Grid */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">Select Problem Type:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {problemTypes.map((pt) => (
                      <button
                        type="button"
                        key={pt}
                        onClick={() => setIssueType(pt)}
                        className={`p-3 rounded-xl text-xs font-semibold text-left transition border ${
                          issueType === pt
                            ? 'bg-cyan-500 text-black font-bold border-cyan-400 shadow-md shadow-cyan-500/20'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {pt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Street Location Select */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Street / Location:</label>
                    <input
                      type="text"
                      value={streetName}
                      onChange={(e) => setStreetName(e.target.value)}
                      placeholder="e.g. Sector 4 Road, MG Road..."
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Severity Level:</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Critical">Critical (Immediate danger)</option>
                      <option value="High">High (Major hindrance)</option>
                      <option value="Medium">Medium (Moderate problem)</option>
                      <option value="Low">Low (Minor cosmetic issue)</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Detailed Description:</label>
                  <textarea
                    rows={4}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue, landmarks, size, danger to traffic/pedestrians..."
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl p-4 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Optional Contact Email */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Optional Contact Email (For updates):</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="citizen@gmail.com"
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm rounded-2xl transition shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Submitting Report...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Submit Citizen Report to NagarDrishti</span>
                  </>
                )}
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}

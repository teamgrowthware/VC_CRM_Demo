'use client';

import React, { useState, useEffect } from 'react';
import { PerformanceReview } from '@/types/performance';
import { getAllReviews, createReview, getEmployeeReviews } from '@/lib/api/performance';
import { fetchEmployees } from '@/lib/api/employee';
import { Employee } from '@/types/employee';
import { useAuth } from '@/hooks/useAuth';
import { Star, Award, MessageSquare, Plus, User, Calendar, TrendingUp } from 'lucide-react';

export default function PerformancePage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      if (['ADMIN', 'MANAGER', 'HR'].includes(user?.role || '')) {
        const [reviewsData, employeesData] = await Promise.all([
          getAllReviews(),
          fetchEmployees()
        ]);
        setReviews(reviewsData);
        setEmployees(employeesData);
      } else if (user?.id) {
        const myReviews = await getEmployeeReviews(user.id);
        setReviews(myReviews);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchInitialData();
  }, [user]);

  const handleSubmitReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as any;
    
    try {
      await createReview(data);
      setShowModal(false);
      fetchInitialData();
    } catch (e) {
      console.error(e);
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Performance Appraisals</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Track employee growth and feedback history</p>
        </div>
        {['ADMIN', 'MANAGER', 'HR'].includes(user?.role || '') && (
          <button 
            onClick={() => setShowModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Submit Review
          </button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-purple-600 mb-2">
            <Star className="w-5 h-5 fill-current" />
            <h3 className="text-sm font-semibold">Average Rating</h3>
          </div>
          <p className="text-3xl font-bold">{averageRating} / 5.0</p>
          <p className="text-xs text-zinc-500 mt-1">Based on {reviews.length} total reviews</p>
        </div>
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
            <Award className="w-5 h-5" />
            <h3 className="text-sm font-semibold">Total Submissions</h3>
          </div>
          <p className="text-3xl font-bold">{reviews.length}</p>
          <p className="text-xs text-zinc-500 mt-1">This fiscal year</p>
        </div>
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <TrendingUp className="w-5 h-5" />
            <h3 className="text-sm font-semibold">Growth Trend</h3>
          </div>
          <p className="text-3xl font-bold font-mono">+12%</p>
          <p className="text-xs text-zinc-500 mt-1">Compared to last quarter</p>
        </div>
      </div>

      {/* Review List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" /> Detailed Feedback
        </h2>
        {loading ? (
          <div className="text-center py-10 text-zinc-500">Loading reviews...</div>
        ) : reviews.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm hover:border-purple-300 dark:hover:border-purple-900/50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center font-bold text-lg">
                      {review.employee?.name.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100">{review.employee?.name}</h4>
                      <p className="text-xs text-zinc-500 uppercase tracking-tighter font-medium">{review.employee?.department?.name || review.period}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex gap-1 text-amber-500 mb-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-4 h-4 ${s <= review.rating ? 'fill-current' : 'opacity-20'}`} />
                      ))}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-medium">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg italic text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed border-l-4 border-purple-500">
                  "{review.feedback}"
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
                  <User className="w-3 h-3" />
                  <span>Review by <span className="font-semibold text-zinc-700 dark:text-zinc-300">{review.reviewer?.name}</span></span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-50 dark:bg-zinc-900/50 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl py-20 text-center text-zinc-500">
            No performance reviews found.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-lg">New Performance Review</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-700">×</button>
            </div>
            <form onSubmit={handleSubmitReview} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Select Employee</label>
                <select name="employeeId" required className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="">Choose...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.department?.name || 'No Dept'})</option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Rating (1-5)</label>
                    <select name="rating" required className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="5">5 - Excellent</option>
                        <option value="4">4 - Very Good</option>
                        <option value="3">3 - Good</option>
                        <option value="2">2 - Fair</option>
                        <option value="1">1 - Poor</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1">Review Period</label>
                    <select name="period" required className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="Q1 2024">Q1 2024</option>
                        <option value="Q2 2024">Q2 2024</option>
                        <option value="Annual 2024">Annual 2024</option>
                        <option value="Probationary">Probationary</option>
                    </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Feedback & Comments</label>
                <textarea name="feedback" required className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 h-32 resize-none" placeholder="Provide constructive feedback..." />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors shadow-md">Submit Review</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

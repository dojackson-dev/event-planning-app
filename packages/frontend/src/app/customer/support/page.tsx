'use client'

import { useState } from 'react'
import { 
  HelpCircle, 
  MessageCircle, 
  Phone, 
  Mail, 
  FileText, 
  ChevronRight,
  ChevronDown,
  Search,
  Clock,
  ExternalLink,
  BookOpen,
  CreditCard,
  Calendar,
  Shield,
  CheckCircle
} from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
  category: string
}

export default function CustomerSupportPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'general',
    message: ''
  })
  const [ticketSubmitted, setTicketSubmitted] = useState(false)

  const faqs: FAQItem[] = [
    {
      question: 'How do I book an event?',
      answer: 'To book an event, click on "Request Booking" in your dashboard or navigate to the booking page. Follow the step-by-step wizard to select your event type, date, services, and provide your contact information. Our team will review your request and get back to you within 24 hours.',
      category: 'Booking'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, MasterCard, American Express), bank transfers, and PayPal. You can also pay in installments for larger events - just ask about our payment plans when booking.',
      category: 'Payments'
    },
    {
      question: 'Can I modify my booking after confirmation?',
      answer: 'Yes, you can request modifications to your booking up to 7 days before your event. Navigate to "My Events," select the event, and click "Request Changes." Additional services can be added anytime based on availability.',
      category: 'Booking'
    },
    {
      question: 'What is your cancellation policy?',
      answer: 'Cancellations made 30+ days before the event receive a full refund minus a 10% processing fee. Cancellations 14-30 days out receive 50% refund. Cancellations within 14 days are non-refundable but may be credited toward a future event.',
      category: 'Policies'
    },
    {
      question: 'How do I message the venue team?',
      answer: 'Use our in-app messaging feature! Go to "Messages" in your dashboard to start a conversation with our team. You\'ll receive notifications for new replies, and all communication is saved for your reference.',
      category: 'Communication'
    },
    {
      question: 'Where can I view my contract?',
      answer: 'All your event contracts are available in the "My Contracts" section. You can view, download, and sign contracts electronically. You\'ll also receive a PDF copy via email once signed.',
      category: 'Contracts'
    }
  ]

  const filteredFAQs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would submit to the backend
    setTicketSubmitted(true)
    setTimeout(() => {
      setTicketSubmitted(false)
      setTicketForm({ subject: '', category: 'general', message: '' })
    }, 3000)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
        <p className="text-gray-500 mt-2">
          Find answers to common questions or get in touch with our team
        </p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Quick Help Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="bg-blue-100 rounded-xl p-3 w-fit mb-3">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Getting Started Guide</h3>
          <p className="text-sm text-gray-500 mb-3">Learn how to make the most of your account</p>
          <button className="text-sm text-primary-600 font-medium flex items-center hover:text-primary-700">
            Read Guide <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="bg-green-100 rounded-xl p-3 w-fit mb-3">
            <CreditCard className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Payment Help</h3>
          <p className="text-sm text-gray-500 mb-3">Payment methods, invoices, and refunds</p>
          <button className="text-sm text-primary-600 font-medium flex items-center hover:text-primary-700">
            View Info <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
          <div className="bg-purple-100 rounded-xl p-3 w-fit mb-3">
            <Calendar className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Booking FAQ</h3>
          <p className="text-sm text-gray-500 mb-3">Common questions about bookings</p>
          <button className="text-sm text-primary-600 font-medium flex items-center hover:text-primary-700">
            Learn More <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FAQ Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <HelpCircle className="w-5 h-5 mr-2 text-primary-600" />
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-3">
            {filteredFAQs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No FAQs match your search. Try different keywords or contact us below.
              </p>
            ) : (
              filteredFAQs.map((faq, index) => (
                <div key={index} className="border border-gray-100 rounded-lg">
                  <button
                    onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left"
                  >
                    <span className="font-medium text-gray-900">{faq.question}</span>
                    {openFAQ === index ? (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {openFAQ === index && (
                    <div className="px-4 pb-4">
                      <p className="text-gray-600 text-sm">{faq.answer}</p>
                      <span className="inline-block mt-3 px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        {faq.category}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Contact Options */}
        <div className="space-y-6">
          {/* Contact Cards */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Us</h2>
            
            <div className="space-y-4">
              <a 
                href="/customer/messages"
                className="flex items-center gap-4 p-4 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors group"
              >
                <div className="bg-primary-600 rounded-xl p-3">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">In-App Messages</h3>
                  <p className="text-sm text-gray-500">Chat with our team directly</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
              </a>
              
              <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl">
                <div className="bg-green-100 rounded-xl p-3">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Phone Support</h3>
                  <p className="text-sm text-gray-500">(555) 123-4567</p>
                </div>
                <span className="text-xs text-gray-400 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  9am-6pm ET
                </span>
              </div>
              
              <a
                href="mailto:support@dovenue.com"
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="bg-orange-100 rounded-xl p-3">
                  <Mail className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Email Support</h3>
                  <p className="text-sm text-gray-500">support@dovenue.com</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-600" />
              </a>
            </div>
          </div>

          {/* Submit Ticket */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-primary-600" />
              Submit a Support Ticket
            </h2>
            
            {ticketSubmitted ? (
              <div className="text-center py-8">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Ticket Submitted!</h3>
                <p className="text-sm text-gray-500">We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={ticketForm.subject}
                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                    placeholder="Brief description of your issue"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="general">General Question</option>
                    <option value="booking">Booking Issue</option>
                    <option value="payment">Payment Issue</option>
                    <option value="technical">Technical Problem</option>
                    <option value="feedback">Feedback</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={ticketForm.message}
                    onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                    placeholder="Describe your issue in detail..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  Submit Ticket
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

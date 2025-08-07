export interface GuideSection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  content: string;
}

export const guideSections: GuideSection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    subtitle: 'The Captain & Destination',
    icon: '🚀',
    content: `Picture this: You get on a boat and tell the captain, "Take me to a nice place."

Most students approach ChatGPT like they're giving directions to a confused captain. Let's see the difference:

❌ Vague Student: "Take me to a nice place"
✅ Smart Student: "Take me to Labadi Beach in Accra, Ghana, specifically the quieter section near the Independence Arch, around sunset time for the best photos."

The Lesson: Most students are essentially walking up to ChatGPT and mumbling, "Uh, help me with stuff, I guess?" Then they wonder why the responses aren't helpful!

What You'll Master:
• Study Smarter - Transform how you approach learning with AI-powered techniques
• Think Clearer - Develop critical thinking skills through strategic prompting
• Get Results - Achieve academic excellence with proven frameworks`,
  },
  {
    id: 'prompt-advantage',
    title: '3.1 The Prompt Advantage',
    subtitle: 'Why Most Students Get It Wrong',
    icon: '🎯',
    content: `The GIGO Principle: "Garbage In, Garbage Out"

❌ Bad Example: "help me"
AI Response: "I'd be happy to help! However, I need more specific information..."

✅ Good Example: "I'm a college freshman struggling with the light-dependent reactions in photosynthesis for my biology exam next week. Can you explain how ATP and NADPH are produced in simple terms with a real-world analogy?"

The 6-Part Prompt Anatomy:
1. CONTEXT: "I'm a [your level] studying [subject]..."
2. TASK: "I need help with [specific thing]..."
3. SPECIFICS: "Specifically, I'm struggling with [exact problem]..."
4. FORMAT: "Please explain using [how you want it explained]..."
5. CONSTRAINTS: "Keep it [length/style preferences]..."
6. EXAMPLES: "Like when you explained [reference if helpful]..."

What ChatGPT CAN Do:
• Explain complex concepts with analogies and examples
• Guide your thinking with Socratic questions
• Review your work and provide feedback
• Create study materials and practice questions

What ChatGPT CANNOT Do:
• Do your homework or replace your thinking
• Access current events or real-time information
• Replace your professor or provide official grades
• Conduct original research or experiments`,
  },
  {
    id: 'academic-mastery',
    title: '3.2 Academic Mastery',
    subtitle: 'Universal Framework for Learning',
    icon: '📚',
    content: `The Feynman Technique with AI

Use ChatGPT to test if you really understand something. If you can't explain it simply, you don't understand it well enough.

🎯 Feynman Technique Prompt:
"I'm going to explain [concept] to you as if you're a 12-year-old. Stop me when I use jargon or when something doesn't make sense, and ask me to clarify."

The Socratic Method

Instead of getting direct answers, let ChatGPT guide you to discover solutions through strategic questioning.

🤔 Socratic Method Prompt:
"Instead of giving me the answer to [problem], ask me guiding questions that help me figure it out myself. Start with the most basic question I need to consider."

Reading Comprehension Booster

📚 Before Reading:
"I'm about to read [chapter/article title]. Based on the title and what you know about [subject], what key questions should I be asking myself as I read?"

🧠 After Reading:
"I just read about [topic]. Test my understanding by asking me 3 questions that check if I grasped the main concepts and their connections."

Exam Preparation Strategy

📅 Study Plan Prompt:
"I have [X days] to prepare for my [subject] exam covering [topics]. Based on my current understanding (I'm confident about A and B, but struggling with C and D), create a day-by-day study schedule that focuses more time on my weak areas."`,
  },
  {
    id: 'advanced-techniques',
    title: '3.3 Advanced Techniques',
    subtitle: 'That Set You Apart from Other Students',
    icon: '⚡',
    content: `Bracket Notation for Laser Focus

Use brackets to highlight your main focus while providing helpful context.

📝 Example:
"I'm writing a research paper on climate change impacts. [I specifically want to focus on how rising sea levels affect coastal communities in West Africa]. I need help understanding the economic implications, but I also want to consider social and cultural impacts."

Chain-of-Thought Prompting

For complex problems, ask ChatGPT to show its reasoning step-by-step.

🧠 Template:
"Think through this step-by-step and show your reasoning: [your complex problem]. Break down your thought process so I can follow along and understand not just the answer, but how to approach similar problems."

Role-Playing Prompts

✍️ For Writing Help:
"Act as an experienced writing tutor who specializes in [your subject]. Review my essay introduction and help me strengthen my argument structure. Be constructive but honest about what needs improvement."

🎓 For Exam Prep:
"Act as a strict but fair professor. Quiz me on [topic] and don't accept vague answers. Push me to be more specific and precise in my explanations."

🔍 For Research:
"Act as a research librarian who knows [your field] well. Help me find the best approach to research [topic] and suggest what types of sources I should prioritize."

Iterative Refinement

Follow-up Examples:
• "That's helpful, but can you focus more on [specific aspect]?"
• "Can you give me a concrete example of that concept?"
• "How does this apply to [your specific situation]?"
• "What would be the counterargument to this point?"
• "Can you explain that part again, but simpler?"`,
  },
  {
    id: 'study-workflows',
    title: '3.4 Study Workflows',
    subtitle: 'That Actually Work in Real Life',
    icon: '🧠',
    content: `Research & Essay Workflow

Stop jumping straight into writing. Use this proven progression:

1. 🔍 Topic Exploration - Brainstorm angles and perspectives
2. 🎯 Thesis Development - Craft a strong, specific argument
3. 📋 Outline Creation - Structure your arguments logically
4. ✍️ Draft & Feedback - Write and refine with AI help

Active Recall & Testing System

🎯 Active Recall Prompt:
"Create 5 practice questions about [topic] that test my understanding. After I answer each one, don't tell me if I'm right or wrong immediately. Instead, ask me to explain my reasoning, then give me feedback on both my answer and my thinking process."

Review & Revision Protocol

🎯 Weakness Identification Prompt:
"Based on our conversation about [subject], what concepts do I seem to understand well, and which ones need more work? Create a targeted study plan focusing on my weak areas, with specific techniques for each problem area."

Common Mistakes Students Make

❌ Mistake 1: Being Too Vague
Bad: "Help me with my essay"
Good: "Help me strengthen the argument in my introduction paragraph about renewable energy"

❌ Mistake 2: Asking for Answers Instead of Understanding
Bad: "What's the answer to number 5?"
Good: "I'm stuck on number 5. Can you help me understand what approach I should take?"

❌ Mistake 3: Not Providing Context
Bad: "Explain photosynthesis"
Good: "I'm a biology student struggling with the light-dependent reactions in photosynthesis. Can you explain how ATP and NADPH are produced?"`,
  },
  {
    id: 'tools-integration',
    title: '3.5 Tools & Integration',
    subtitle: 'Supercharge Your Learning Workflow',
    icon: '🔧',
    content: `Free Tools That Work Great

🆓 ChatGPT (Free)
Perfect for most study tasks, explanations, and basic help

🆓 Google Docs + ChatGPT
Copy-paste workflow for essay feedback and revision

🆓 Anki + AI-Generated Cards
Use ChatGPT to create flashcards, then import to Anki

Paid Tools Worth Considering

💰 ChatGPT Plus ($20/month)
Faster responses, GPT-4 access, and priority during high traffic

💰 Notion AI ($10/month)
AI integrated directly into your note-taking system

💰 Grammarly Premium ($12/month)
Advanced writing suggestions beyond basic grammar

Mobile Optimization Tips

📱 Mobile Study Hacks:
• Voice input: Use your phone's voice-to-text for longer prompts
• Template library: Save your best prompt templates in your notes app
• Screenshot responses: Save important AI responses for later review
• Quick access: Add ChatGPT to your home screen for faster access
• Offline backup: Copy important explanations to your notes for offline review

Smart Integration Strategies

🎯 Integration Best Practices:
• Start small: Pick one technique and master it before adding more
• Create templates: Save your best prompts for reuse across subjects
• Track what works: Keep notes on which prompts give you the best results
• Combine tools: Use ChatGPT for content, Grammarly for polish, Anki for retention
• Build habits: Integrate AI help into your existing study routine, don't replace it`,
  },
  {
    id: 'next-steps',
    title: 'Your Next Steps',
    subtitle: 'Start Your AI-Powered Learning Journey',
    icon: '🎯',
    content: `Your 7-Day Action Plan

🚀 Day 1-2: Master the GIGO principle. Practice with 5 different prompts, comparing vague vs specific versions.

🚀 Day 3-4: Try the Feynman Technique on a concept you're currently studying. Use ChatGPT as your "12-year-old" audience.

🚀 Day 5: Build your first 6-part prompt using the anatomy framework. Save it as a template for future use.

🚀 Day 6: Experiment with role-playing prompts. Try having ChatGPT act as a tutor, professor, and study buddy.

🚀 Day 7: Create an active recall quiz for your next exam using ChatGPT. Test yourself and refine the questions.

Quick Reference Checklist

✅ I understand the GIGO principle and why specific prompts matter
✅ I can create a 6-part prompt using the anatomy framework
✅ I know how to use the Feynman Technique with AI
✅ I can implement the Socratic Method for deeper learning
✅ I understand bracket notation and chain-of-thought prompting
✅ I have a study workflow that integrates AI tools
✅ I know which tools to use and when to use them
✅ I have a 7-day action plan to implement these techniques

Remember: The goal isn't to replace your thinking with AI, but to amplify your learning with AI. Start with one technique, master it, then add another. Your future self will thank you!`,
  },
];

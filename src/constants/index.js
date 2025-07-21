import {
    mobile,
    backend,
    creator,
    web,
    javascript,
    typescript,
    html,
    css,
    reactjs,
    redux,
    tailwind,
    nodejs,
    mongodb,
    git,
    figma,
    docker,
    meta,
    infosys,  
    techzoetic,
    carrent,
    jobit,
    tripguide,
    threejs,
} from "../assets";
  
  export const navLinks = [
    {
      id: "about",
      title: "About",
    },
    {
      id: "work",
      title: "Work",
    },
    {
      id: "contact",
      title: "Contact",
    },
  ];
  
  const services = [
    {
      title: "Web Developer",
      icon: web,
    },
    {
      title: "React Native Developer",
      icon: mobile,
    },
    {
      title: "Backend Developer",
      icon: backend,
    },
    {
      title: "Content Creator",
      icon: creator,
    },
  ];
  
  const technologies = [
    {
      name: "HTML 5",
      icon: html,
    },
    {
      name: "CSS 3",
      icon: css,
    },
    {
      name: "JavaScript",
      icon: javascript,
    },
    {
      name: "TypeScript",
      icon: typescript,
    },
    {
      name: "React JS",
      icon: reactjs,
    },
    {
      name: "Redux Toolkit",
      icon: redux,
    },
    {
      name: "Tailwind CSS",
      icon: tailwind,
    },
    {
      name: "Node JS",
      icon: nodejs,
    },
    {
      name: "MongoDB",
      icon: mongodb,
    },
    {
      name: "Three JS",
      icon: threejs,
    },
    {
      name: "git",
      icon: git,
    },
    {
      name: "figma",
      icon: figma,
    },
    {
      name: "docker",
      icon: docker,
    },
  ];
  
  const experiences = [
    {
      title: "SOFTWARE ENGINEER",
      company_name: "TECHZOETIC",
      icon: techzoetic,
      iconBg: "#383E56",
      date: "08/2024 - Present",
      points: [
        "Designed and developed Power Apps solutions with a strong focus on front-end design, responsive UI, and user experience for internal and client-facing applications.",
        "Built custom Microsoft Dynamics 365 CRM applications for a wood products company: Implemented bespoke entities, forms, workflows, and business rules for inventory management and order processing. Developed C# plugins and JavaScript logic, reducing manual errors by 30%.",
        "Led development of Canvas Apps and Power Pages integration for an Academic Promotion platform: Integrated multi-language fields and role-based security. Secured access via OTP authentication using Power Automate and Azure Functions (99.9% uptime).",
        "Developed a Power Pages portal for a trading company: Enabled Excel-based product catalog imports with server-side validation using Liquid. Integrated Google OAuth 2.0 for external partner login.",
        "Automated business processes using Power Automate, achieving: 15% reduction in manual tasks and 20% boost in productivity. Routine approvals, notifications, and data syncs across Microsoft 365 services.",
        "Delivered a 25% efficiency improvement through a custom Power Apps solution for a Credit Union.",
        "Collaborated with cross-functional teams and stakeholders to gather requirements, define technical specifications, and implement scalable Power Platform solutions.",
        "Contributed to CI/CD pipelines, participated in code reviews, and maintained documentation aligned with best practices."
      ],
    },
    {
      title: "SYSTEM ENGINEER",
      company_name: "INFOSYS",
      icon: infosys,
      iconBg: "#E6DEDD",
      date: "03/2022 - 07/2024",
      points: [
        "Automated Power Platform solution exports/imports (managed solutions) across environments using Power Platform CLI, Azure DevOps pipelines and PowerShell.",
        "Built custom connectors, virtual tables and Power Automate flows for REST API data exchange between D365 CRM, external systems and Power Pages.",
        "Version‑controlled Canvas Apps, PCF controls and Power Pages assets in Git; tracked work in Jira/Azure Boards.",
        "Developed Power Pages portals with Liquid templates, web roles and secure forms."
      ],
    },
  ];
  
  const testimonials = [
    {
      testimonial:
        "I thought it was impossible to make a website as beautiful as our product, but Rick proved me wrong.",
      name: "Sara Lee",
      designation: "CFO",
      company: "Acme Co",
      image: "https://randomuser.me/api/portraits/women/4.jpg",
    },
    {
      testimonial:
        "I've never met a web developer who truly cares about their clients' success like Rick does.",
      name: "Chris Brown",
      designation: "COO",
      company: "DEF Corp",
      image: "https://randomuser.me/api/portraits/men/5.jpg",
    },
    {
      testimonial:
        "After Rick optimized our website, our traffic increased by 50%. We can't thank them enough!",
      name: "Lisa Wang",
      designation: "CTO",
      company: "456 Enterprises",
      image: "https://randomuser.me/api/portraits/women/6.jpg",
    },
  ];
  
  const projects = [
    {
      name: "Car Rent",
      description:
        "Web-based platform that allows users to search, book, and manage car rentals from various providers, providing a convenient and efficient solution for transportation needs.",
      tags: [
        {
          name: "react",
          color: "blue-text-gradient",
        },
        {
          name: "mongodb",
          color: "green-text-gradient",
        },
        {
          name: "tailwind",
          color: "pink-text-gradient",
        },
      ],
      image: carrent,
      source_code_link: "https://github.com/",
    },
    {
      name: "Job IT",
      description:
        "Web application that enables users to search for job openings, view estimated salary ranges for positions, and locate available jobs based on their current location.",
      tags: [
        {
          name: "react",
          color: "blue-text-gradient",
        },
        {
          name: "restapi",
          color: "green-text-gradient",
        },
        {
          name: "scss",
          color: "pink-text-gradient",
        },
      ],
      image: jobit,
      source_code_link: "https://github.com/",
    },
    {
      name: "Trip Guide",
      description:
        "A comprehensive travel booking platform that allows users to book flights, hotels, and rental cars, and offers curated recommendations for popular destinations.",
      tags: [
        {
          name: "nextjs",
          color: "blue-text-gradient",
        },
        {
          name: "supabase",
          color: "green-text-gradient",
        },
        {
          name: "css",
          color: "pink-text-gradient",
        },
      ],
      image: tripguide,
      source_code_link: "https://github.com/",
    },
  ];
  
  export { services, technologies, experiences, testimonials, projects };
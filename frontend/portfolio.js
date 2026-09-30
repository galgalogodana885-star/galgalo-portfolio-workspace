const menuToggle = document.querySelector("#menuToggle");
const siteNav = document.querySelector("#siteNav");
const contactForm = document.querySelector("#contactForm");
const formMessage = document.querySelector("#formMessage");
const heroPortrait = document.querySelector("#heroPortrait");

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Open navigation" : "Close navigation",
  );
  siteNav.classList.toggle("is-open", !isOpen);
  document.body.classList.toggle("menu-open", !isOpen);
});

siteNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    siteNav.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    document.body.classList.remove("menu-open");
  });
});

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(contactForm);
  const subject = `Project inquiry: ${form.get("service") || "Web development"}`;
  const body = [
    `Name: ${form.get("name")}`,
    `Email: ${form.get("email")}`,
    `Service: ${form.get("service")}`,
    `Budget: ${form.get("budget") || "Not specified"}`,
    "",
    form.get("details"),
  ].join("\n");
  const gmailUrl = new URL("https://mail.google.com/mail/");
  gmailUrl.searchParams.set("view", "cm");
  gmailUrl.searchParams.set("fs", "1");
  gmailUrl.searchParams.set("to", "galgalogodana885@gmail.com");
  gmailUrl.searchParams.set("su", subject);
  gmailUrl.searchParams.set("body", body);

  window.open(gmailUrl.toString(), "_blank", "noopener,noreferrer");
  formMessage.textContent =
    "A Gmail draft opened in a new tab. Review and send it from Gmail.";
});

heroPortrait.addEventListener("error", () => {
  heroPortrait.remove();
});

const articles = {
  fastapi: {
    category: "PYTHON / FASTAPI / 6 MIN READ",
    title: "Building clear APIs with FastAPI",
    sections: [
      {
        heading: "Start with the shape of the data",
        paragraphs: [
          "An API is a contract between a client and a service. Before adding routes, decide what a request needs to contain and what a successful response should return. Clear request and response models make that contract visible in code and in FastAPI's generated documentation.",
          "Pydantic models can validate incoming data at the boundary. Give fields useful types and constraints, and return a response model so internal values do not accidentally become public API output.",
        ],
      },
      {
        heading: "Keep each route focused",
        paragraphs: [
          "A route should translate HTTP details into an application operation: read validated input, call the relevant logic, and choose an appropriate response. When a handler also contains every database query and business rule, it becomes harder to test and change safely.",
          "Group related endpoints with routers as the application grows. Routers make a project's public surface easier to scan without requiring a large architecture before it is needed.",
        ],
      },
      {
        heading: "Separate persistence from decisions",
        paragraphs: [
          "Database code answers questions such as which records belong to a user and how they are stored. Business rules answer whether an operation is allowed and what it means. Keeping those responsibilities distinct makes it easier to reuse and test the important decisions.",
          "With SQLAlchemy and PostgreSQL or MySQL, make ownership part of the query itself. Fetching a record by both its identifier and the current user's identifier helps prevent one account from accessing another account's data.",
        ],
      },
      {
        heading: "Return useful errors",
        paragraphs: [
          "Use HTTP status codes consistently: validation failures should tell the client what input needs attention, missing records should be reported as not found, and unauthenticated requests should not receive protected data.",
          "Keep error details useful to the caller without exposing passwords, database connection strings, stack traces, or other internal information. A predictable error shape makes frontend handling much simpler.",
        ],
      },
      {
        heading: "Test the contract, not just the function",
        paragraphs: [
          "A focused API test can send a request through the application and verify its status, response shape, and database effect. Include ordinary success cases, invalid input, missing records, and ownership boundaries.",
          "FastAPI's test client makes these checks approachable. Run tests against a separate database or an isolated test fixture so the suite never changes real user records.",
        ],
        code: `from fastapi import FastAPI\nfrom pydantic import BaseModel, Field\n\napp = FastAPI()\n\nclass NoteCreate(BaseModel):\n    title: str = Field(min_length=1, max_length=120)\n\n@app.post("/notes")\ndef create_note(note: NoteCreate):\n    return {"title": note.title.strip()}`,
      },
    ],
  },
  performance: {
    category: "PERFORMANCE / 5 MIN READ",
    title: "Small changes that make websites faster",
    sections: [
      {
        heading: "Measure before changing code",
        paragraphs: [
          "A page can feel slow for several different reasons: the server takes time to respond, the browser downloads too much, a large image arrives late, or JavaScript blocks the first useful interaction. Start with a repeatable measurement instead of guessing.",
          "Use a browser performance trace and a Lighthouse report on both a warm local build and a realistic mobile connection. Focus on the slowest important route and record the result before optimizing so the next measurement can tell you whether the change helped.",
        ],
      },
      {
        heading: "Treat images as part of the layout",
        paragraphs: [
          "Large images are often the heaviest assets on a page. Export them at the size they are actually displayed, use an efficient format such as WebP or AVIF when supported, and provide dimensions so the browser can reserve the correct space before the file loads.",
          "Load below-the-fold images lazily, but do not lazy-load the main image that defines the first screen. Give meaningful images useful alternative text, and keep decorative images out of the accessibility tree.",
        ],
      },
      {
        heading: "Send less JavaScript up front",
        paragraphs: [
          "Review the initial bundle for libraries or features the first screen does not need. Route-level splitting, removing unused dependencies, and loading optional interactions only when requested can reduce both download and execution time.",
          "Use native browser behavior where it fits: links for navigation, forms for submission, and built-in lazy loading for images. These choices often improve resilience and accessibility while reducing custom code.",
        ],
      },
      {
        heading: "Protect layout stability",
        paragraphs: [
          "A page that shifts while loading feels slow even if the network is fast. Reserve space for images, ads, embeds, and other content that arrives later. Use a stable aspect ratio for media and avoid inserting banners above content after the page has settled.",
          "Typography can shift too. Choose a sensible fallback font and use font-display behavior that keeps text visible while a web font loads. A polished page should remain usable when a remote font is unavailable.",
        ],
      },
      {
        heading: "Make one change, then measure again",
        paragraphs: [
          "Core Web Vitals provide a useful frame: LCP describes when the main content appears, INP reflects interaction responsiveness, and CLS tracks unexpected layout movement. They are clues to investigate, not a substitute for understanding the actual user journey.",
          "After each targeted improvement, measure the same page under the same conditions. A smaller bundle or a green score matters when it makes the experience meaningfully faster for the people using the site.",
        ],
      },
    ],
  },
  "ethiopia-career": {
    category: "CAREER / 6 MIN READ",
    title: "Building a web career in Ethiopia",
    sections: [
      {
        heading: "Build proof, not just a list of tools",
        paragraphs: [
          "A skills list is easy to write; a small working project shows how you think. Choose a clear problem, finish a useful first version, and explain the decisions behind it. A well-presented project can show more than a long list of technologies ever will.",
          "Make each project easy to inspect: include a live link when possible, a short explanation of the audience, the main features, and what you personally built. A concise README and a few screenshots help someone understand the work before they open the code.",
        ],
      },
      {
        heading: "Solve problems people can recognize",
        paragraphs: [
          "Good portfolio ideas do not have to be large or unusual. A clear service page, a reliable booking flow, an accessible local directory, or a simple inventory tool can demonstrate the same fundamentals as a much bigger product.",
          "Start by talking with the people who might use the thing. Ask what currently takes time, what information they need, and what a successful first version would help them do. That conversation gives the project a more useful direction than adding features by instinct.",
        ],
      },
      {
        heading: "Practice the full delivery",
        paragraphs: [
          "A web project includes more than its code. Clarify the goal, agree on the scope, share progress early, test on a phone, and explain what is included before delivery. These habits matter whether a project is for a client, a community group, or your own portfolio.",
          "When working across different time zones or payment methods, make communication and expectations explicit. Confirm milestones, deliverables, and how changes will be handled in writing so everyone knows what comes next.",
        ],
      },
      {
        heading: "Keep learning in public",
        paragraphs: [
          "Write short notes about what you tried, what broke, and what you learned. Share a small code example or a before-and-after improvement. Clear communication builds trust and helps other developers learn alongside you.",
          "Look for feedback from peers and users, then apply it to the next version. A career grows through consistent practice, useful collaboration, and work you can explain—not through chasing every new framework at once.",
        ],
      },
      {
        heading: "A practical next step",
        paragraphs: [
          "Pick one project you can finish in a few weeks. Define one audience and one main outcome, build the smallest complete experience, and deploy it somewhere people can try it. Then ask a few people to use it and note where they hesitate.",
          "That finished, tested, clearly explained project becomes a foundation for the next one—and a stronger starting point for conversations with clients, teams, and collaborators.",
        ],
      },
    ],
  },
};

const articleDialog = document.querySelector("#articleDialog");
const articleTitle = document.querySelector("#articleTitle");
const articleDialogMeta = document.querySelector("#articleDialogMeta");
const articleBody = document.querySelector("#articleBody");

function renderArticle(article) {
  articleTitle.textContent = article.title;
  articleDialogMeta.textContent = article.category;
  articleBody.replaceChildren();

  article.sections.forEach((section) => {
    const sectionElement = document.createElement("section");
    const heading = document.createElement("h3");
    heading.textContent = section.heading;
    sectionElement.append(heading);
    section.paragraphs.forEach((text) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      sectionElement.append(paragraph);
    });
    if (section.code) {
      const codeBlock = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = section.code;
      codeBlock.append(code);
      sectionElement.append(codeBlock);
    }
    articleBody.append(sectionElement);
  });
}

document.querySelectorAll("[data-article]").forEach((button) => {
  button.addEventListener("click", () => {
    const article = articles[button.dataset.article];
    if (!article) return;
    renderArticle(article);
    articleDialog.showModal();
    document.querySelector("#closeArticle").focus();
  });
});

document.querySelector("#closeArticle").addEventListener("click", () => {
  articleDialog.close();
});

document.querySelector("#articleContact").addEventListener("click", () => {
  articleDialog.close();
});

articleDialog.addEventListener("click", (event) => {
  if (event.target === articleDialog) articleDialog.close();
});
const revealObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

document
  .querySelectorAll(
    ".section-head, .skill-group, .service-row, .project-card, .article-row",
  )
  .forEach((element) => {
    element.classList.add("reveal");
    revealObserver.observe(element);
  });

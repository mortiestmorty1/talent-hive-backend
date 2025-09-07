import prisma from "../prisma/client.js";

const SKILL_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"];

// Helpers
const parseIntSafe = (value, fallback = 0) => {
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? fallback : num;
};

const toDateOrUndefined = (value) => {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

export const getProfileExtra = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { skills: true, certifications: true, portfolio: true },
    });
    if (!user) return res.status(404).send("User not found");
    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

// Skills
export const getSkills = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { skills: true } });
    if (!user) return res.status(404).send("User not found");
    return res.status(200).json(user.skills || []);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const addSkill = async (req, res) => {
  try {
    const { skillName, level, yearsOfExperience } = req.body;
    if (!skillName || !level) return res.status(400).send("skillName and level are required");
    if (!SKILL_LEVELS.includes(level)) return res.status(400).send("Invalid skill level");

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { skills: true } });
    if (!user) return res.status(404).send("User not found");

    const skills = user.skills || [];
    const exists = skills.some((s) => s.skillName.toLowerCase() === String(skillName).toLowerCase());
    if (exists) return res.status(409).send("Skill already exists");

    const newSkill = {
      skillName,
      level,
      yearsOfExperience: yearsOfExperience !== undefined ? parseIntSafe(yearsOfExperience) : undefined,
      certifications: [],
    };

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { skills: [...skills, newSkill] },
      select: { skills: true },
    });
    return res.status(201).json(updated.skills);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const updateSkill = async (req, res) => {
  try {
    const index = parseIntSafe(req.params.index, -1);
    if (index < 0) return res.status(400).send("Invalid index");
    const { skillName, level, yearsOfExperience } = req.body;
    if (level && !SKILL_LEVELS.includes(level)) return res.status(400).send("Invalid skill level");

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { skills: true } });
    if (!user) return res.status(404).send("User not found");
    const skills = user.skills || [];
    if (index >= skills.length) return res.status(404).send("Skill not found");

    const updatedSkill = {
      ...skills[index],
      ...(skillName !== undefined ? { skillName } : {}),
      ...(level !== undefined ? { level } : {}),
      ...(yearsOfExperience !== undefined ? { yearsOfExperience: parseIntSafe(yearsOfExperience) } : {}),
    };
    const updatedSkills = skills.map((s, i) => (i === index ? updatedSkill : s));
    const updated = await prisma.user.update({ where: { id: req.userId }, data: { skills: updatedSkills }, select: { skills: true } });
    return res.status(200).json(updated.skills);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const deleteSkill = async (req, res) => {
  try {
    const index = parseIntSafe(req.params.index, -1);
    if (index < 0) return res.status(400).send("Invalid index");
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { skills: true } });
    if (!user) return res.status(404).send("User not found");
    const skills = user.skills || [];
    if (index >= skills.length) return res.status(404).send("Skill not found");
    const updatedSkills = skills.filter((_, i) => i !== index);
    const updated = await prisma.user.update({ where: { id: req.userId }, data: { skills: updatedSkills }, select: { skills: true } });
    return res.status(200).json(updated.skills);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const addSkillCertification = async (req, res) => {
  try {
    const index = parseIntSafe(req.params.index, -1);
    if (index < 0) return res.status(400).send("Invalid index");
    const { name, issuer, issueDate, expiryDate, credentialId, credentialUrl } = req.body;
    if (!name) return res.status(400).send("name is required");

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { skills: true } });
    if (!user) return res.status(404).send("User not found");
    const skills = user.skills || [];
    if (index >= skills.length) return res.status(404).send("Skill not found");

    const cert = {
      name,
      issuer, 
      issueDate: toDateOrUndefined(issueDate), 
      expiryDate: toDateOrUndefined(expiryDate), 
      credentialId, 
      credentialUrl,
    };

    const updatedSkills = skills.map((s, i) => (i === index ? { ...s, certifications: [...(s.certifications || []), cert] } : s));
    const updated = await prisma.user.update({ where: { id: req.userId }, data: { skills: updatedSkills }, select: { skills: true } });
    return res.status(201).json(updated.skills[index].certifications);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const deleteSkillCertification = async (req, res) => {
  try {
    const sIndex = parseIntSafe(req.params.sIndex, -1);
    const cIndex = parseIntSafe(req.params.cIndex, -1);
    if (sIndex < 0 || cIndex < 0) return res.status(400).send("Invalid index");
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { skills: true } });
    if (!user) return res.status(404).send("User not found");
    const skills = user.skills || [];
    if (sIndex >= skills.length) return res.status(404).send("Skill not found");
    const skill = skills[sIndex];
    const certs = skill.certifications || [];
    if (cIndex >= certs.length) return res.status(404).send("Certification not found");

    const updatedSkills = skills.map((s, i) => (i === sIndex ? { ...s, certifications: certs.filter((_, j) => j !== cIndex) } : s));
    const updated = await prisma.user.update({ where: { id: req.userId }, data: { skills: updatedSkills }, select: { skills: true } });
    return res.status(200).json(updated.skills[sIndex].certifications);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

// Top-level Certifications
export const getCertifications = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { certifications: true } });
    if (!user) return res.status(404).send("User not found");
    return res.status(200).json(user.certifications || []);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const addCertification = async (req, res) => {
  try {
    const { name, issuer, issueDate, expiryDate, credentialId, credentialUrl } = req.body;
    if (!name) return res.status(400).send("name is required");
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { certifications: true } });
    if (!user) return res.status(404).send("User not found");
    const cert = { name, issuer, issueDate: toDateOrUndefined(issueDate), expiryDate: toDateOrUndefined(expiryDate), credentialId, credentialUrl };
    const updated = await prisma.user.update({ where: { id: req.userId }, data: { certifications: [...(user.certifications || []), cert] }, select: { certifications: true } });
    return res.status(201).json(updated.certifications);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const updateCertification = async (req, res) => {
  try {
    const index = parseIntSafe(req.params.index, -1);
    if (index < 0) return res.status(400).send("Invalid index");
    const { name, issuer, issueDate, expiryDate, credentialId, credentialUrl } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { certifications: true } });
    if (!user) return res.status(404).send("User not found");
    const certs = user.certifications || [];
    if (index >= certs.length) return res.status(404).send("Certification not found");
    const updatedCert = {
      ...certs[index],
      ...(name !== undefined ? { name } : {}),
      ...(issuer !== undefined ? { issuer } : {}),
      ...(issueDate !== undefined ? { issueDate: toDateOrUndefined(issueDate) } : {}),
      ...(expiryDate !== undefined ? { expiryDate: toDateOrUndefined(expiryDate) } : {}),
      ...(credentialId !== undefined ? { credentialId } : {}),
      ...(credentialUrl !== undefined ? { credentialUrl } : {}),
    };
    const updated = await prisma.user.update({ where: { id: req.userId }, data: { certifications: certs.map((c, i) => (i === index ? updatedCert : c)) }, select: { certifications: true } });
    return res.status(200).json(updated.certifications);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const deleteCertification = async (req, res) => {
  try {
    const index = parseIntSafe(req.params.index, -1);
    if (index < 0) return res.status(400).send("Invalid index");
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { certifications: true } });
    if (!user) return res.status(404).send("User not found");
    const certs = user.certifications || [];
    if (index >= certs.length) return res.status(404).send("Certification not found");
    const updated = await prisma.user.update({ where: { id: req.userId }, data: { certifications: certs.filter((_, i) => i !== index) }, select: { certifications: true } });
    return res.status(200).json(updated.certifications);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

// Portfolio
export const getPortfolio = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { portfolio: true } });
    if (!user) return res.status(404).send("User not found");
    return res.status(200).json(user.portfolio || []);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const addPortfolioItem = async (req, res) => {
  try {
    const { title, description, projectUrl, technologies } = req.body;
    if (!title) return res.status(400).send("title is required");
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { portfolio: true } });
    if (!user) return res.status(404).send("User not found");

    const imageUrls = (req.files || []).map((f) => f.path);
    const techs = Array.isArray(technologies)
      ? technologies
      : typeof technologies === "string" && technologies.length
      ? technologies.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const newItem = {
      title,
      description,
      imageUrls,
      projectUrl,
      technologies: techs,
    };
    const updated = await prisma.user.update({ where: { id: req.userId }, data: { portfolio: [...(user.portfolio || []), newItem] }, select: { portfolio: true } });
    return res.status(201).json(updated.portfolio);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const updatePortfolioItem = async (req, res) => {
  try {
    const index = parseIntSafe(req.params.index, -1);
    if (index < 0) return res.status(400).send("Invalid index");
    const { title, description, projectUrl, technologies, replaceImages } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { portfolio: true } });
    if (!user) return res.status(404).send("User not found");
    const items = user.portfolio || [];
    if (index >= items.length) return res.status(404).send("Portfolio item not found");

    const techs = technologies === undefined
      ? undefined
      : Array.isArray(technologies)
      ? technologies
      : typeof technologies === "string" && technologies.length
      ? technologies.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

    const newImages = (req.files || []).map((f) => f.path);
    const current = items[index];
    const mergedImages = replaceImages === "true" || replaceImages === true ? newImages : [...(current.imageUrls || []), ...newImages];

    const updatedItem = {
      ...current,
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(projectUrl !== undefined ? { projectUrl } : {}),
      ...(techs !== undefined ? { technologies: techs } : {}),
      ...(newImages.length ? { imageUrls: mergedImages } : {}),
    };

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { portfolio: items.map((p, i) => (i === index ? updatedItem : p)) },
      select: { portfolio: true },
    });
    return res.status(200).json(updated.portfolio);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};

export const deletePortfolioItem = async (req, res) => {
  try {
    const index = parseIntSafe(req.params.index, -1);
    if (index < 0) return res.status(400).send("Invalid index");
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { portfolio: true } });
    if (!user) return res.status(404).send("User not found");
    const items = user.portfolio || [];
    if (index >= items.length) return res.status(404).send("Portfolio item not found");
    const updated = await prisma.user.update({ where: { id: req.userId }, data: { portfolio: items.filter((_, i) => i !== index) }, select: { portfolio: true } });
    return res.status(200).json(updated.portfolio);
  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
};



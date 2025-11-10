import mongoose from 'mongoose';
import QuestionBank from '../models/QuestionBank.js';
import Enrollment from '../models/Enrollment.js';

const OBJECTIVE_TYPES = new Set([
  'MULTIPLE_CHOICE',
  'MULTI_SELECT',
  'TRUE_FALSE',
  'SHORT_ANSWER',
  'FILL_IN_THE_BLANK',
  'NUMERIC',
  'FORMULA',
  'MATCHING',
]);

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function normalizeAnswer(answer) {
  if (Array.isArray(answer)) {
    return [...answer].map((v) => (typeof v === 'string' ? v.trim() : v)).sort();
  }
  if (typeof answer === 'string') {
    return answer.trim();
  }
  if (answer && typeof answer === 'object') {
    return Object.keys(answer)
      .sort()
      .reduce((acc, key) => ({ ...acc, [key]: answer[key] }), {});
  }
  return answer;
}

function evaluateObjective(question, response) {
  const grading = question.grading || {};
  const maxMarks = grading.maxMarks ?? question.maxMarks ?? 1;
  const negative = grading.negativeMarks ?? question.negativeMarks ?? 0;

  if (response === undefined || response === null || response === '') {
    return { autoScore: 0, maxMarks, isCorrect: false, negativeApplied: 0 };
  }

  const normalizedAnswer = normalizeAnswer(response);
  const normalizedKey = normalizeAnswer(question.answerKey ?? question.answer);

  let isCorrect = false;
  let autoScore = 0;
  let negativeApplied = 0;

  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE':
    case 'SHORT_ANSWER':
    case 'FILL_IN_THE_BLANK':
    case 'FORMULA': {
      const caseSensitive = grading.caseSensitive ?? false;
      if (!caseSensitive && typeof normalizedAnswer === 'string' && typeof normalizedKey === 'string') {
        isCorrect = normalizedAnswer.toLowerCase() === normalizedKey.toLowerCase();
      } else {
        isCorrect = normalizedAnswer === normalizedKey;
      }
      autoScore = isCorrect ? maxMarks : 0;
      break;
    }
    case 'MULTI_SELECT': {
      const answerArray = Array.isArray(normalizedAnswer) ? normalizedAnswer : [];
      const keyArray = Array.isArray(normalizedKey) ? normalizedKey : [];
      const correctSelections = answerArray.filter((opt) => keyArray.includes(opt));
      if (grading.partialCredit?.enabled) {
        const fraction = keyArray.length ? correctSelections.length / keyArray.length : 0;
        if (grading.partialCredit.mode === 'CUSTOM' && grading.partialCredit.rules) {
          autoScore = grading.partialCredit.rules[fraction] ?? fraction * maxMarks;
        } else {
          autoScore = Math.min(maxMarks, Math.max(0, fraction * maxMarks));
        }
      } else {
        autoScore = answerArray.length === keyArray.length && correctSelections.length === keyArray.length ? maxMarks : 0;
      }
      isCorrect = autoScore === maxMarks;
      break;
    }
    case 'NUMERIC': {
      const tolerance = grading.numericTolerance ?? 0;
      const numericAnswer = Number(normalizedAnswer);
      const numericKey = Number(normalizedKey);
      if (Number.isFinite(numericAnswer) && Number.isFinite(numericKey)) {
        isCorrect = Math.abs(numericAnswer - numericKey) <= tolerance;
        autoScore = isCorrect ? maxMarks : 0;
      }
      break;
    }
    case 'MATCHING': {
      const answerPairs = normalizedAnswer || {};
      const keyPairs = normalizedKey || {};
      const keys = Object.keys(keyPairs);
      const correct = keys.filter((key) => answerPairs[key] === keyPairs[key]);
      if (grading.partialCredit?.enabled) {
        const fraction = keys.length ? correct.length / keys.length : 0;
        autoScore = Math.min(maxMarks, Math.max(0, fraction * maxMarks));
      } else {
        autoScore = correct.length === keys.length ? maxMarks : 0;
      }
      isCorrect = autoScore === maxMarks;
      break;
    }
    default:
      autoScore = 0;
  }

  if (!isCorrect && negative > 0) {
    autoScore -= negative;
    negativeApplied = negative;
  }

  return { autoScore, maxMarks, isCorrect, negativeApplied };
}

function determineRequiresManual(question) {
  return !OBJECTIVE_TYPES.has(question.type);
}

export async function ensurePrerequisitesMet(quiz, userId) {
  if (!quiz.access?.requirePrerequisites || !quiz.access?.prerequisiteCourses?.length) {
    return true;
  }
  const completed = await Enrollment.find({
    user: userId,
    course: { $in: quiz.access.prerequisiteCourses },
    status: 'COMPLETED',
  }).distinct('course');
  return quiz.access.prerequisiteCourses.every((courseId) => completed.some((id) => id.equals(courseId)));
}

function prepareOptionSet(question, shuffleOptionsFlag) {
  if (!Array.isArray(question.options)) return undefined;
  if (!shuffleOptionsFlag) return question.options;
  return shuffle(question.options).map((opt) => ({ ...opt }));
}

export async function buildAttemptBlueprint(quiz) {
  if (!quiz.bank) throw new Error('Quiz bank is required to assemble questions');
  const bank = await QuestionBank.findById(quiz.bank);
  if (!bank) throw new Error('Question bank not found');

  const sections = [];
  const questionBlueprint = [];

  const configuredSections = (quiz.sections && quiz.sections.length)
    ? quiz.sections
    : [{
        title: 'General',
        order: 0,
        randomize: quiz.scoring?.shuffleQuestions,
        questionSelections: bank.questions.map((question) => ({ questionId: question._id, count: 1 })),
      }];

  for (const section of configuredSections) {
    const sectionId = new mongoose.Types.ObjectId();
    const sectionQuestions = [];

    for (const selection of section.questionSelections ?? []) {
      let questionsPool = [];
      if (selection.questionId) {
        const question = bank.questions.id(selection.questionId);
        if (question) questionsPool.push(question);
      } else {
        questionsPool = bank.questions.filter((question) => {
          let matches = true;
          if (selection.criteria?.tags?.length) {
            matches = selection.criteria.tags.every((tag) => question.metadata?.tags?.includes(tag));
          }
          if (matches && selection.criteria?.difficulty) {
            matches = question.metadata?.difficulty === selection.criteria.difficulty;
          }
          if (matches && selection.criteria?.type) {
            matches = question.type === selection.criteria.type;
          }
          if (matches && selection.criteria?.includeIds?.length) {
            matches = selection.criteria.includeIds.some((id) => {
              if (!id) return false;
              if (typeof id === 'string') return id === String(question._id);
              return id.equals ? id.equals(question._id) : String(id) === String(question._id);
            });
          }
          return matches;
        });
      }

      if (!questionsPool.length) continue;
      const pickCount = Math.min(selection.count ?? questionsPool.length, questionsPool.length);
      const selected = selection.questionId
        ? questionsPool
        : shuffle(questionsPool).slice(0, pickCount);

      selected.forEach((questionDoc) => {
        const question = questionDoc.toObject({ getters: true, virtuals: false });
        sectionQuestions.push({ question, selection });
      });
    }

    const ordered = section.randomize ? shuffle(sectionQuestions) : sectionQuestions;
    ordered.forEach(({ question, selection }) => {
      const blueprintQuestion = {
        sectionId,
        questionId: question._id,
        prompt: question.prompt,
        type: question.type,
        options: prepareOptionSet(question, selection.shuffleOptions || quiz.scoring?.shuffleOptions),
        answerKey: question.answerKey ?? question.answer,
        maxMarks: selection.maxMarks ?? question.grading?.maxMarks ?? 1,
        negativeMarks: selection.negativeMarks ?? question.grading?.negativeMarks ?? 0,
        partialCredit: question.grading?.partialCredit,
        requiresManual: determineRequiresManual(question),
        explanation: question.explanation,
      };
      questionBlueprint.push(blueprintQuestion);
    });

    sections.push({
      sectionId,
      title: section.title,
      order: section.order,
      weight: section.weight,
    });
  }

  const shuffledBlueprint = quiz.scoring?.shuffleQuestions ? shuffle(questionBlueprint) : questionBlueprint;

  return { sections, questionBlueprint: shuffledBlueprint };
}

export function gradeAttempt(questionBlueprint, attemptPayload, quiz) {
  const responses = attemptPayload.responses || [];
  const responseMap = new Map(responses.map((item) => [String(item.questionId), item]));
  const gradedQuestions = [];

  let totalScore = 0;
  let autoScore = 0;
  let manualScore = 0;
  let maxScore = 0;
  let requiresManualReview = false;

  for (const question of questionBlueprint) {
    const response = responseMap.get(String(question.questionId));
    const value = response?.value ?? response?.response ?? response;
    const requiresManual = question.requiresManual ?? determineRequiresManual(question);
    let autoResult = { autoScore: 0, maxMarks: question.maxMarks ?? 1, isCorrect: false, negativeApplied: 0 };

    if (!requiresManual) {
      autoResult = evaluateObjective(question, value);
    } else {
      requiresManualReview = true;
    }

    const questionMax = question.maxMarks ?? autoResult.maxMarks ?? 1;
    const questionAutoScore = requiresManual ? 0 : autoResult.autoScore;
    const questionManualScore = requiresManual ? 0 : 0;

    autoScore += questionAutoScore;
    manualScore += questionManualScore;
    maxScore += questionMax;

    const questionScore = Math.max(0, Math.min(questionMax, questionAutoScore + questionManualScore));
    totalScore += questionScore;

    gradedQuestions.push({
      ...question,
      response: value,
      autoScore: questionAutoScore,
      manualScore: questionManualScore,
      maxMarks: questionMax,
      requiresManual,
      status: requiresManual && !questionAutoScore ? 'REVIEW_PENDING' : 'GRADED',
    });
  }

  const percentage = maxScore ? (totalScore / maxScore) * 100 : 0;
  const passingType = quiz.scoring?.passingType ?? 'PERCENTAGE';
  const passingValue = quiz.scoring?.passingValue ?? 0;
  const passed = passingType === 'POINTS' ? totalScore >= passingValue : percentage >= passingValue;

  return {
    gradedQuestions,
    totalScore,
    autoScore,
    manualScore,
    maxScore,
    percentage,
    requiresManualReview,
    passed,
  };
}

export function canGradeAttempt(quiz, user) {
  if (!user) return false;
  if (['TEACHER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) return true;
  if (user.role !== 'TA') return false;
  return quiz.graders?.some((graderId) => graderId.equals?.(user._id));
}

export function canViewAttempt(quiz, attempt, user) {
  if (!user) return false;
  if (user.role === 'STUDENT') return attempt.student.equals(user._id);
  if (['TEACHER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) return true;
  if (user.role === 'TA') {
    return quiz.graders?.some((graderId) => graderId.equals?.(user._id));
  }
  return false;
}

export function summarizeAttempts(attempts) {
  const summary = {
    totalAttempts: attempts.length,
    averageScore: 0,
    averagePercentage: 0,
    highestScore: 0,
    lowestScore: attempts.length ? attempts[0].score : 0,
    completionRate: 0,
    questionBreakdown: new Map(),
  };

  if (!attempts.length) return { ...summary, questionBreakdown: [] };

  let completedCount = 0;
  let totalScore = 0;
  let totalPercentage = 0;

  for (const attempt of attempts) {
    if (attempt.status === 'SUBMITTED' || attempt.status === 'GRADED' || attempt.status === 'RELEASED') {
      completedCount += 1;
    }
    totalScore += attempt.score ?? 0;
    totalPercentage += attempt.percentage ?? 0;
    summary.highestScore = Math.max(summary.highestScore, attempt.score ?? 0);
    summary.lowestScore = Math.min(summary.lowestScore, attempt.score ?? 0);

    for (const question of attempt.questionBlueprint ?? []) {
      if (!summary.questionBreakdown.has(String(question.questionId))) {
        summary.questionBreakdown.set(String(question.questionId), {
          questionId: question.questionId,
          correctCount: 0,
          attempts: 0,
          totalScore: 0,
          maxScore: question.maxMarks ?? 1,
        });
      }
      const entry = summary.questionBreakdown.get(String(question.questionId));
      entry.attempts += 1;
      entry.totalScore += question.autoScore + question.manualScore;
      if ((question.autoScore + question.manualScore) >= (question.maxMarks ?? 1)) {
        entry.correctCount += 1;
      }
    }
  }

  summary.totalAttempts = attempts.length;
  summary.averageScore = totalScore / attempts.length;
  summary.averagePercentage = totalPercentage / attempts.length;
  summary.completionRate = (completedCount / attempts.length) * 100;
  summary.questionBreakdown = Array.from(summary.questionBreakdown.values()).map((entry) => ({
    ...entry,
    averageScore: entry.totalScore / entry.attempts,
    correctnessRate: entry.attempts ? (entry.correctCount / entry.attempts) * 100 : 0,
  }));

  return summary;
}

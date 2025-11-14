import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Course from '../src/models/Course.js';
import {
  ensureActivityReferences,
  normalizeActivityPayload,
  normalizeSectionPayload,
} from '../src/utils/courseBuilder.js';

test('normalizeActivityPayload sets defaults and ids', () => {
  const activity = normalizeActivityPayload({ title: 'Intro' });
  assert.ok(activity._id, 'expected generated _id');
  assert.equal(activity.type, 'CONTENT');
  assert.equal(activity.title, 'Intro');
});

test('normalizeSectionPayload increments order based on course', () => {
  const course = new Course({
    code: 'C-101',
    title: 'Sample',
    createdBy: new mongoose.Types.ObjectId(),
    sections: [{ _id: new mongoose.Types.ObjectId(), title: 'Section A', activities: [] }],
  });
  const section = normalizeSectionPayload(course, { title: 'Next' });
  assert.equal(section.order, 1);
  assert.equal(section.title, 'Next');
});

test('ensureActivityReferences validates quiz existence', async () => {
  const quizModel = { exists: async () => null };
  await assert.rejects(
    () => ensureActivityReferences({ type: 'QUIZ', metadata: { quizId: '123' } }, { quizModel }),
    /Referenced quiz does not exist/
  );
  const passingModel = { exists: async () => true };
  await assert.doesNotReject(() =>
    ensureActivityReferences({ type: 'QUIZ', metadata: { quizId: '123' } }, { quizModel: passingModel })
  );
});

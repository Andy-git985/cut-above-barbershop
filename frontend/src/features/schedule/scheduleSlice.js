import { createSelector, createEntityAdapter } from '@reduxjs/toolkit';
import { apiSlice } from '../../app/api/apiSlice';
import {
  selectDate,
  selectDateDisabled,
  selectService,
  selectEmployee,
} from '../filter/filterSlice';
import { selectEmployeeIds } from '../employees/employeeSlice';
import dateServices from '../date/date';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const scheduleAdapter = createEntityAdapter({
  sortComparer: (a, b) => a.date.localeCompare(b.date),
});

const initialState = scheduleAdapter.getInitialState();

export const extendedApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSchedule: builder.query({
      query: () => '/schedule',
      transformResponse: (responseData) => {
        console.log('Schedule response data', responseData);
        return scheduleAdapter.setAll(initialState, responseData);
      },
      // keepUnusedDataFor: 5,
      providesTags: ['Schedule'],
    }),
    addSchedule: builder.mutation({
      query: (schedule) => ({
        url: '/schedule',
        method: 'POST',
        body: schedule,
      }),
      invalidatesTags: ['Schedule'],
    }),
    updateSchedule: builder.mutation({
      query: (schedule) => ({
        url: `/schedule/${schedule.id}`,
        method: 'PUT',
        body: schedule,
      }),
      invalidatesTags: ['Schedule'],
    }),
  }),
});

export const {
  useGetScheduleQuery,
  useAddScheduleMutation,
  useUpdateScheduleMutation,
} = extendedApiSlice;

export const selectScheduleResult =
  extendedApiSlice.endpoints.getSchedule.select();

const selectScheduleData = createSelector(
  selectScheduleResult,
  (scheduleResult) => scheduleResult.data // normalized state object with ids & entities
);

export const { selectAll: selectAllSchedule, selectById: selectScheduleById } =
  scheduleAdapter.getSelectors(
    (state) => selectScheduleData(state) ?? initialState
  );

export const selectScheduleByFilter = createSelector(
  selectAllSchedule,
  selectDate,
  selectEmployee,
  selectEmployeeIds,
  selectService,
  (schedule, date, employee, employees, service) => {
    const scheduleByDate = schedule.find(
      (s) => dateServices.dateHyphen(s.date) === dateServices.dateHyphen(date)
    );
    if (!scheduleByDate) {
      return null;
    }
    const availableTimeSlots = findAvailableTimeSlots(
      scheduleByDate,
      service.duration,
      employees
    );
    return availableTimeSlots;
  }
);

function findAvailableTimeSlots(obj, userInput, employees) {
  const { open, close, appointments } = obj;
  const dateFormat = 'HH:mm';
  const slotDuration = userInput;
  const searchIncrement = 15;
  const slots = [];
  let slotStart = dayjs(open);
  const slotEnd = dayjs(close);

  while (slotStart.isBefore(slotEnd)) {
    const currentSlotEnd = slotStart.add(slotDuration, 'minute');
    const currentSlotStartString = slotStart.format(dateFormat);
    const currentSlotEndString = currentSlotEnd.format(dateFormat);

    if (currentSlotEnd.isAfter(slotEnd)) {
      break;
    }

    const availableEmployees = employees.filter((employeeId) => {
      const employeeAppointments = appointments.filter(
        (appointment) => appointment.employee === employeeId
      );
      const employeeBooked = employeeAppointments.some(
        (appointment) =>
          dayjs(appointment.start, dateFormat).isBefore(currentSlotEnd) &&
          dayjs(appointment.end, dateFormat).isAfter(slotStart)
      );
      return !employeeBooked;
    });

    if (availableEmployees.length > 0) {
      slots.push({
        id: crypto.randomUUID(),
        start: currentSlotStartString,
        end: currentSlotEndString,
        available: availableEmployees,
      });
    }

    slotStart = slotStart.add(searchIncrement, 'minute');
  }

  return slots;
}

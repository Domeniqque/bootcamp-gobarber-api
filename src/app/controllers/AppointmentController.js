import * as Yup from 'yup';
import { parseISO, startOfHour, isBefore } from 'date-fns';
import User from '../models/User';
import File from '../models/File';
import Appointment from '../models/Appointment';

class AppointmentController {
  async index(req, res) {
    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null },
      attributes: ['id', 'date'],
      order: ['date'],
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });

    return res.json(appointments);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      date: Yup.date().required(),
      provider_id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { provider_id, date } = req.body;
    /**
     * Check provider
     */
    const providerExists = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    if (!providerExists) {
      return res
        .status(400)
        .json({ error: 'You can only create appointments with providers ' });
    }

    /**
     * Check past dates
     */
    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past date are not permited' });
    }

    /**
     * Check date availability
     */
    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      return res
        .status(400)
        .json({ error: 'Appointment date is not available' });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date,
    });

    return res.json(appointment);
  }
}

export default new AppointmentController();

import { getTodayIsoKolkata } from '../utils/gymLogic'

const todayIso = getTodayIsoKolkata()

const addDays = (baseDate, days) => {
  const next = new Date(baseDate)
  next.setDate(next.getDate() + days)
  return next.toISOString().slice(0, 10)
}

const formatDisplayTime = (minutesAfterSix) => {
  const hours = 18 + Math.floor(minutesAfterSix / 60)
  const mins = minutesAfterSix % 60
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours % 12 || 12
  return `${displayHour}:${String(mins).padStart(2, '0')} ${suffix}`
}

const requiredMembers = [
  {
    memberId: '102',
    name: 'Rahul Patil',
    phone: '9876543210',
    plan: 'Monthly',
    fee: 500,
    startDate: '2026-10-01',
    expiryDate: '2026-10-08',
    paymentMethod: 'UPI',
    photo: '',
    attendanceHistory: [
      { date: '2026-10-05', time: '6:51 PM', status: 'Present' },
      { date: '2026-10-04', time: '6:43 PM', status: 'Present' },
      { date: '2026-10-03', time: '7:02 PM', status: 'Present' },
      { date: '2026-10-02', time: '6:38 PM', status: 'Present' },
    ],
  },
  {
    memberId: '103',
    name: 'Amit More',
    phone: '9823012456',
    plan: 'Monthly',
    fee: 500,
    startDate: '2026-10-01',
    expiryDate: '2026-10-10',
    paymentMethod: 'Cash',
    photo: '',
    attendanceHistory: [
      { date: '2026-10-05', time: '6:48 PM', status: 'Present' },
      { date: '2026-10-04', time: '6:40 PM', status: 'Present' },
      { date: '2026-10-03', time: '6:59 PM', status: 'Present' },
    ],
  },
  {
    memberId: '104',
    name: 'Sanket Joshi',
    phone: '9765432187',
    plan: 'Monthly',
    fee: 500,
    startDate: '2026-10-01',
    expiryDate: '2026-10-11',
    paymentMethod: 'UPI',
    photo: '',
    attendanceHistory: [
      { date: '2026-10-05', time: '7:01 PM', status: 'Present' },
      { date: '2026-10-04', time: '6:44 PM', status: 'Present' },
      { date: '2026-10-02', time: '6:55 PM', status: 'Present' },
    ],
  },
  {
    memberId: '105',
    name: 'Pratik Mahale',
    phone: '9890123456',
    plan: 'Monthly',
    fee: 500,
    startDate: '2026-10-01',
    expiryDate: '2026-10-13',
    paymentMethod: 'Cash',
    photo: '',
    attendanceHistory: [
      { date: '2026-10-05', time: '6:42 PM', status: 'Present' },
      { date: '2026-10-04', time: '7:04 PM', status: 'Present' },
      { date: '2026-10-02', time: '6:45 PM', status: 'Present' },
    ],
  },
  {
    memberId: '106',
    name: 'Rohit Shinde',
    phone: '9812345678',
    plan: 'Monthly',
    fee: 500,
    startDate: '2026-09-15',
    expiryDate: '2026-10-31',
    paymentMethod: 'UPI',
    photo: '',
    attendanceHistory: [
      { date: '2026-10-05', time: '5:58 PM', status: 'Present' },
      { date: '2026-10-03', time: '6:26 PM', status: 'Present' },
      { date: '2026-10-01', time: '6:31 PM', status: 'Present' },
    ],
  },
  {
    memberId: '107',
    name: 'Akash Chaudhari',
    phone: '9988776655',
    plan: 'Monthly',
    fee: 500,
    startDate: '2026-09-20',
    expiryDate: '2026-11-01',
    paymentMethod: 'Cash',
    photo: '',
    attendanceHistory: [
      { date: '2026-10-05', time: '6:38 PM', status: 'Present' },
      { date: '2026-10-03', time: '6:21 PM', status: 'Present' },
      { date: '2026-10-01', time: '6:36 PM', status: 'Present' },
    ],
  },
  {
    memberId: '108',
    name: 'Vivek Patil',
    phone: '9898989898',
    plan: 'Monthly',
    fee: 500,
    startDate: '2026-09-15',
    expiryDate: '2026-10-05',
    paymentMethod: 'Cash',
    photo: '',
    attendanceHistory: [
      { date: '2026-10-04', time: '6:29 PM', status: 'Present' },
      { date: '2026-10-02', time: '5:57 PM', status: 'Present' },
    ],
  },
  {
    memberId: '109',
    name: 'Nikhil Wagh',
    phone: '9001122334',
    plan: 'Monthly',
    fee: 500,
    startDate: '2026-09-22',
    expiryDate: '2026-10-15',
    paymentMethod: 'UPI',
    photo: '',
    attendanceHistory: [
      { date: '2026-10-05', time: '6:48 PM', status: 'Present' },
      { date: '2026-10-02', time: '6:46 PM', status: 'Present' },
      { date: '2026-10-01', time: '7:05 PM', status: 'Present' },
    ],
  },
  {
    memberId: '110',
    name: 'Omkar Deshmukh',
    phone: '9112233445',
    plan: 'Monthly',
    fee: 500,
    startDate: '2026-09-25',
    expiryDate: '2026-10-20',
    paymentMethod: 'UPI',
    photo: '',
    attendanceHistory: [
      { date: '2026-10-05', time: '6:58 PM', status: 'Present' },
      { date: '2026-10-03', time: '7:06 PM', status: 'Present' },
      { date: '2026-10-01', time: '6:32 PM', status: 'Present' },
    ],
  },
  {
    memberId: '111',
    name: 'Kunal Borse',
    phone: '9223344556',
    plan: 'Monthly',
    fee: 500,
    startDate: '2026-09-18',
    expiryDate: '2026-10-25',
    paymentMethod: 'Cash',
    photo: '',
    attendanceHistory: [
      { date: '2026-10-04', time: '6:31 PM', status: 'Present' },
      { date: '2026-10-02', time: '6:19 PM', status: 'Present' },
      { date: '2026-10-01', time: '6:54 PM', status: 'Present' },
    ],
  },
  {
    memberId: '112',
    name: 'Yash Kulkarni',
    phone: '9334455667',
    plan: 'Monthly',
    fee: 500,
    startDate: '2026-09-19',
    expiryDate: '2026-10-28',
    paymentMethod: 'UPI',
    photo: '',
    attendanceHistory: [
      { date: '2026-10-05', time: '6:44 PM', status: 'Present' },
      { date: '2026-10-03', time: '6:39 PM', status: 'Present' },
      { date: '2026-10-01', time: '6:52 PM', status: 'Present' },
    ],
  },
  {
    memberId: '113',
    name: 'Aditya Sonawane',
    phone: '9445566778',
    plan: 'Monthly',
    fee: 500,
    startDate: '2026-09-28',
    expiryDate: '2026-10-30',
    paymentMethod: 'Cash',
    photo: '',
    attendanceHistory: [
      { date: '2026-10-05', time: '6:41 PM', status: 'Present' },
      { date: '2026-10-04', time: '6:50 PM', status: 'Present' },
      { date: '2026-10-02', time: '6:28 PM', status: 'Present' },
    ],
  },
]

const extraMemberNames = [
  'Sagar Pawar', 'Nilesh Shirsat', 'Rohan Kshirsagar', 'Harshad Jagtap', 'Manoj Tambe',
  'Abhishek Ingale', 'Tejas Khandare', 'Deepak Dhokale', 'Sachin Sapkal', 'Vikram Mali',
  'Dheeraj Wankhede', 'Ajay Gawande', 'Mahesh Yadav', 'Pankaj Patil', 'Rajesh Kale',
  'Aniket Suryawanshi', 'Jayesh Fale', 'Rushikesh Dahale', 'Vishal Bangar', 'Mangesh Pande',
  'Prashant Gadge', 'Suhas Jadhav', 'Sandesh Ahire', 'Vaibhav Gade', 'Ashutosh Mahajan',
  'Nikhil Nandgave', 'Kiran Kadam', 'Sunil Patil', 'Mahendra Nikam', 'Shubham Patil',
  'Viraj Bhamare', 'Gaurav Kulkarni', 'Adesh Kharat', 'Bhushan Borse', 'Swapnil Marathe',
  'Saurabh Koli', 'Ruturaj Nale', 'Tushar Sharma', 'Dinesh Suryawanshi', 'Nandkishor Mhaske',
  'Milind Suryavanshi', 'Chaitanya Pabale', 'Sankalp Sonawane', 'Ritesh Salunke', 'Amit Patil',
  'Vijay Godse', 'Kedar Barde', 'Vinayak Kale', 'Ketan Patil', 'Jagdish Mokashi',
  'Ravindra Mourya', 'Siddhesh Jadhav', 'Akshay Shinde', 'Nitin Sonawane', 'Yogesh Bagul',
  'Pushkar Jadhav', 'Devendra Jadhav', 'Raghav Bagul', 'Hrushikesh Dandge', 'Sameer Bhalerao',
  'Chetan Chavan', 'Amol Khairnar', 'Darshan Aher', 'Vishnu Sable', 'Nandu Wagh', 'Rakesh Sonawane',
]

const extraMembers = Array.from({ length: 116 }, (_, index) => {
  const memberNumber = 114 + index
  const name = extraMemberNames[index % extraMemberNames.length]
  const phone = `9${String(100000000 + index).slice(1, 10)}`
  let expiryDate = addDays(todayIso, 18 + (index % 18))

  if (index < 7) {
    expiryDate = addDays(todayIso, -2 - index)
  } else if (index < 11) {
    expiryDate = addDays(todayIso, 2 + (index - 7))
  }

  const startDate = addDays('2026-09-01', index % 20)

  return {
    memberId: String(memberNumber).padStart(3, '0'),
    name,
    phone,
    plan: 'Monthly',
    fee: 500,
    startDate,
    expiryDate,
    paymentMethod: index % 2 === 0 ? 'UPI' : 'Cash',
    photo: '',
    attendanceHistory: [
      { date: '2026-10-05', time: '6:52 PM', status: 'Present' },
      { date: '2026-10-04', time: '6:47 PM', status: 'Present' },
    ],
  }
})

const allMembers = [...requiredMembers, ...extraMembers]
const todayMembers = allMembers
  .filter((member) => member.memberId !== '102' && member.memberId !== '108')
  .slice(0, 67)
  .map((member, index) => ({
    ...member,
    attendanceHistory: [
      ...(member.attendanceHistory || []),
      {
        date: todayIso,
        time: formatDisplayTime(30 + index * 5),
        status: 'Present',
      },
    ],
  }))

const membersById = new Map()
allMembers.forEach((member) => membersById.set(member.memberId, member))

for (const member of todayMembers) {
  membersById.set(member.memberId, member)
}

export const initialMembers = [...membersById.values()]

export const gymSettings = {
  gymName: 'Guru Fitness Health Club',
  shortName: 'Guru Fitness',
  monthlyMembership: 500,
  phone: '+91 98765 43210',
  city: 'Dhule, Maharashtra',
  address: 'Station Road, Dhule, Maharashtra 424001',
}

export const initialPayments = [
  { date: '2026-10-01', member: 'Rahul Patil', amount: 500, method: 'UPI', period: 'Oct 2026', status: 'Paid' },
  { date: '2026-09-01', member: 'Amit More', amount: 500, method: 'Cash', period: 'Sep 2026', status: 'Paid' },
  { date: '2026-10-01', member: 'Sanket Joshi', amount: 500, method: 'UPI', period: 'Oct 2026', status: 'Paid' },
  { date: '2026-09-01', member: 'Pratik Mahale', amount: 500, method: 'Cash', period: 'Sep 2026', status: 'Paid' },
  { date: '2026-10-01', member: 'Rohit Shinde', amount: 500, method: 'UPI', period: 'Oct 2026', status: 'Paid' },
  { date: '2026-09-01', member: 'Akash Chaudhari', amount: 500, method: 'Cash', period: 'Sep 2026', status: 'Paid' },
  { date: '2026-10-05', member: 'Vivek Patil', amount: 500, method: 'Cash', period: 'Oct 2026', status: 'Pending' },
  { date: '2026-09-15', member: 'Nikhil Wagh', amount: 500, method: 'UPI', period: 'Sep 2026', status: 'Paid' },
  { date: '2026-10-01', member: 'Omkar Deshmukh', amount: 500, method: 'UPI', period: 'Oct 2026', status: 'Paid' },
  { date: '2026-09-25', member: 'Kunal Borse', amount: 500, method: 'Cash', period: 'Sep 2026', status: 'Paid' },
]

import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { db } from '../../server/db';
import SummaryShareCard from '../../components/SummaryShareCard';

interface SharePageProps {
  summary: {
    date: string;
    focusDuration: number;
    text: string;
    completedTaskCount: number;
  };
  user: {
    name: string | null;
  };
  isValid: boolean;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { token } = context.params as { token: string };

  try {
    const shareLink = await db.shareLink.findUnique({
      where: { token },
      include: {
        summary: true,
        user: {
          select: { name: true }
        }
      }
    });

    if (!shareLink) {
      return {
        notFound: true,
      };
    }

    // Reconstruct date string
    // Assuming date stored as "2025-01-12" or similar string in DB based on schema comment
    const dateObj = new Date(shareLink.summary.date);
    const dateStr = dateObj.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      weekday: 'long'
    });

    return {
      props: {
        isValid: true,
        summary: {
            date: dateStr,
            focusDuration: shareLink.summary.totalFocusMinutes,
            text: shareLink.summary.text,
            completedTaskCount: shareLink.summary.completedTaskCount
        },
        user: {
            name: shareLink.user.name || 'Echo User'
        }
      }
    };
  } catch (error) {
    console.error(error);
    return {
      notFound: true,
    };
  }
};

export default function SharePage({ summary, user, isValid }: SharePageProps) {
  if (!isValid) return <div className="min-h-screen flex items-center justify-center">Invalid Link</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      <Head>
        <title>{`${user.name}的每日小结 - Echo`}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Card Container - Scaled for mobile fit */}
      <div className="w-full max-w-[600px] shadow-2xl rounded-2xl overflow-hidden mb-8 transform scale-95 sm:scale-100 transition-transform origin-top">
        <SummaryShareCard 
            dateStr={summary.date}
            focusDuration={summary.focusDuration}
            completedTasks={[]} 
            summary={summary.text}
            userName={user.name || 'User'}
            streakDays={1} 
        />
      </div>

      {/* Intro & CTA */}
      <div className="w-full max-w-[600px] space-y-6 text-center pb-10">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mx-2">
          <h2 className="text-xl font-bold text-gray-800 mb-2">什么是 Echo?</h2>
          <p className="text-gray-600 leading-relaxed text-sm md:text-base text-left">
            Echo 是一个专注于当下、记录成长的工具。在这里，你可以夺回被碎片化信息占用的时间，重拾深度思考的能力。每一天的小结，都是你与自我对话的见证。
          </p>
        </div>

        <div className="px-2">
          <Link href="/" className="block w-full">
              <button className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-teal-200 hover:shadow-teal-300 transform hover:scale-[1.02] transition-all">
                  我也要写小结
              </button>
          </Link>
        </div>
      </div>
    </div>
  );
}





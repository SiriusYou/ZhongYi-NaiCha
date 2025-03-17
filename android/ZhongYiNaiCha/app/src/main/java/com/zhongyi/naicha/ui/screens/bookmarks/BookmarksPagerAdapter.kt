package com.zhongyi.naicha.ui.screens.bookmarks

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.adapter.FragmentStateAdapter
import com.zhongyi.naicha.R
import com.zhongyi.naicha.ui.adapters.ArticleAdapter
import com.zhongyi.naicha.ui.adapters.HerbAdapter

class BookmarksPagerAdapter(
    fragment: Fragment,
    private val articleAdapter: ArticleAdapter,
    private val herbAdapter: HerbAdapter
) : FragmentStateAdapter(fragment) {

    override fun getItemCount(): Int = 2

    override fun createFragment(position: Int): Fragment {
        return when (position) {
            0 -> BookmarkPageFragment.newInstance(BookmarkPageFragment.TYPE_ARTICLE)
            1 -> BookmarkPageFragment.newInstance(BookmarkPageFragment.TYPE_HERB)
            else -> throw IllegalArgumentException("Invalid position: $position")
        }
    }
}

/**
 * Fragment to display either articles or herbs in the ViewPager
 */
class BookmarkPageFragment : Fragment() {

    private var pageType: Int = TYPE_ARTICLE
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        arguments?.let {
            pageType = it.getInt(ARG_PAGE_TYPE, TYPE_ARTICLE)
        }
    }
    
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_bookmark_page, container, false)
    }
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        val recyclerView = view.findViewById<RecyclerView>(R.id.recyclerView)
        
        // Get the parent fragment (BookmarksFragment)
        val parentFragment = parentFragment as? BookmarksFragment
        
        // Set the adapter based on page type
        if (pageType == TYPE_ARTICLE) {
            recyclerView.adapter = parentFragment?.articleAdapter
        } else {
            recyclerView.adapter = parentFragment?.herbAdapter
        }
    }
    
    companion object {
        const val TYPE_ARTICLE = 0
        const val TYPE_HERB = 1
        private const val ARG_PAGE_TYPE = "page_type"
        
        fun newInstance(pageType: Int): BookmarkPageFragment {
            return BookmarkPageFragment().apply {
                arguments = android.os.Bundle().apply {
                    putInt(ARG_PAGE_TYPE, pageType)
                }
            }
        }
    }
} 
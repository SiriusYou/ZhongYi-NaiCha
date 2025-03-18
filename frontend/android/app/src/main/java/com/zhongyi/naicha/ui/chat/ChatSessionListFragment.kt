package com.zhongyi.naicha.ui.chat

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.zhongyi.naicha.R
import com.zhongyi.naicha.databinding.FragmentChatSessionListBinding
import com.zhongyi.naicha.model.ChatSession
import com.zhongyi.naicha.utils.SocketManager

class ChatSessionListFragment : Fragment() {

    private var _binding: FragmentChatSessionListBinding? = null
    private val binding get() = _binding!!
    
    private lateinit var viewModel: ChatViewModel
    private lateinit var adapter: ChatSessionAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentChatSessionListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        setupViewModel()
        setupRecyclerView()
        setupSwipeRefresh()
        setupObservers()
        setupSocketConnection()
        setupNewChatButton()
    }
    
    private fun setupViewModel() {
        viewModel = ViewModelProvider(this)[ChatViewModel::class.java]
    }
    
    private fun setupRecyclerView() {
        adapter = ChatSessionAdapter { session ->
            navigateToChatDetail(session)
        }
        
        binding.recyclerViewSessions.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@ChatSessionListFragment.adapter
        }
    }
    
    private fun setupSwipeRefresh() {
        binding.swipeRefreshLayout.setOnRefreshListener {
            viewModel.loadSessions()
        }
    }
    
    private fun setupObservers() {
        viewModel.sessions.observe(viewLifecycleOwner) { sessions ->
            adapter.submitList(sessions)
            updateEmptyState(sessions.isEmpty())
        }
        
        viewModel.isLoading.observe(viewLifecycleOwner) { isLoading ->
            binding.swipeRefreshLayout.isRefreshing = isLoading
        }
        
        viewModel.errorEvent.observe(viewLifecycleOwner) { errorMsg ->
            if (errorMsg != null) {
                showError(errorMsg)
            }
        }
    }
    
    private fun setupSocketConnection() {
        // Connect to socket
        SocketManager.getInstance(requireContext()).connect()
        
        // Listen for new sessions
        SocketManager.getInstance(requireContext()).onNewSession { session ->
            activity?.runOnUiThread {
                viewModel.addSession(session)
            }
        }
    }
    
    private fun setupNewChatButton() {
        binding.fabNewChat.setOnClickListener {
            findNavController().navigate(R.id.action_navigation_chat_to_newChatFragment)
        }
    }
    
    private fun navigateToChatDetail(session: ChatSession) {
        val action = ChatSessionListFragmentDirections
            .actionNavigationChatToChatDetailFragment(session.id)
        findNavController().navigate(action)
    }
    
    private fun updateEmptyState(isEmpty: Boolean) {
        if (isEmpty) {
            binding.layoutEmptyState.visibility = View.VISIBLE
            binding.recyclerViewSessions.visibility = View.GONE
        } else {
            binding.layoutEmptyState.visibility = View.GONE
            binding.recyclerViewSessions.visibility = View.VISIBLE
        }
    }
    
    private fun showError(message: String) {
        // Show error message using a Snackbar or Toast
    }
    
    override fun onResume() {
        super.onResume()
        viewModel.loadSessions()
    }
    
    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
        
        // Clean up socket listeners but don't disconnect
        SocketManager.getInstance(requireContext()).removeSessionListeners()
    }
} 